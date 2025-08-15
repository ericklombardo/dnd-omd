import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  getImageFromS3,
  resizeImage,
  saveImageToS3,
} from "../helpers/image.ts";
import { logger } from "../helpers/logger.ts";
import { Chapter, Map, Source } from "../types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const s3BucketName =
  process.env.S3_BUCKET_NAME || "h7ktnb-dndbeyond-feywild-maps-stg";

const resizeMapImages = async (map: Map) => {
  const imageKey = map.imageKey;
  const newThumbnailKey = `thumbnails/${imageKey}`;

  logger.log("Processing image", { imageKey });

  let imageBuffer: Buffer | null = null;

  // Retrieve the image from S3
  imageBuffer = await getImageFromS3(s3BucketName, imageKey);

  // Resize the image
  imageBuffer = await resizeImage(imageBuffer);

  // Save the resized image to S3
  await saveImageToS3(s3BucketName, newThumbnailKey, imageBuffer);

  // Cleanup
  imageBuffer = null;
};

const processChapter = async (chapter: Chapter) => {
  if (chapter.maps) {
    for (const map of chapter.maps) {
      await resizeMapImages(map);
    }
  }
};

const processSource = async (source: Source) => {
  if (source.chapters) {
    for (const chapter of source.chapters) {
      await processChapter(chapter);
    }
  }
};

const processJsonFile = async (filePath: string) => {
  const jsonData: Source = JSON.parse(readFileSync(filePath, "utf8"));

  // Process the source
  await processSource(jsonData);
};

// Process all JSON files in the sources directory
const sourcesFolderPath = path.join(__dirname, "../..", "sources");
const sourceFileNames = readdirSync(sourcesFolderPath).filter((fileName) =>
  fileName.endsWith(".json"),
);

for (const fileName of sourceFileNames) {
  const filePath = path.join(sourcesFolderPath, fileName);
  await processJsonFile(filePath);
}

console.log("Map thumbnails created.");
