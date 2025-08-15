import type { SQSEvent, SQSHandler } from "aws-lambda";

import {
  getImageFromS3,
  isImageKey,
  isThumbnailKey,
  resizeImage,
  saveImageToS3,
} from "../helpers/image.ts";
import { logger } from "../helpers/logger.ts";

interface ProcessedS3Event {
  srcBucket: string;
  srcKey: string;
}

const handleS3Events = async (processedEvents: ProcessedS3Event[]) => {
  try {
    for (const { srcBucket, srcKey } of processedEvents) {
      logger.info("Processing image", { srcKey });

      let imageBuffer: Buffer | null = null;
      // Retrieve the image from S3
      imageBuffer = await getImageFromS3(srcBucket, srcKey);

      logger.info("Image received from S3");
      // Resize the image
      imageBuffer = await resizeImage(imageBuffer);

      logger.info("Image resized");

      // Prepare the destination key with the "thumbnails/" prefix
      const destKey = `thumbnails/${srcKey}`;

      // Save the resized image to S3
      await saveImageToS3(srcBucket, destKey, imageBuffer);

      logger.info("Thumbnail saved to S3", { srcKey, destKey });

      // Cleanup
      imageBuffer = null;
    }
  } catch (error) {
    logger.error("Error processing S3 event", {
      error,
      method: "handleS3Record",
    });
    throw error;
  }
};

// Define the SQS event handler function
export const createThumbnail: SQSHandler = async (event: SQSEvent) => {
  try {
    // Check if the event is valid
    if (!event.Records) {
      logger.info("Invalid SQS event", { event });
      return;
    }

    // Deduplicate and process S3 events
    const processedEvents: ProcessedS3Event[] = [];

    for (const record of event.Records) {
      const messageBody = JSON.parse(record.body);

      if (!messageBody.Records) {
        logger.info("Invalid S3 Event", { messageBody });
        continue;
      }
      logger.info("S3 Event received!", { messageBody });
      for (const s3Record of messageBody.Records) {
        // Validate that s3Record is an S3Event
        if (!(s3Record instanceof Object) || !("s3" in s3Record)) {
          logger.info("Invalid S3 Event Record", { s3Record });
          continue;
        }

        const srcBucket = s3Record.s3.bucket.name;
        const srcKey = decodeURIComponent(
          s3Record.s3.object.key.replace(/\+/g, " "),
        );

        // Check if the source key represents an image
        if (!isImageKey(srcKey) || isThumbnailKey(srcKey)) {
          logger.info("Skipping invalid image", { srcKey });
          continue;
        }

        // Deduplicate by srcKey
        const isDuplicate = processedEvents.some(
          (event) => event.srcKey === srcKey,
        );

        if (!isDuplicate) {
          processedEvents.push({ srcBucket, srcKey });
        }
      }
    }

    logger.info("S3 Event Batch", { batch: processedEvents });
    // Process deduplicated S3 events
    await handleS3Events(processedEvents);

    // If processing is successful, log success
    logger.info("Processing successful");
    return;
  } catch (error) {
    // Handle the error or log it as needed
    logger.error("Error processing SQS messages", {
      error,
      method: "createThumbnail",
    });
    throw error;
  }
};
