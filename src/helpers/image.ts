import { Readable } from "node:stream";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

import { logger } from "./logger";

const getS3Config = () => {
  let localStackHost = process.env.LOCALSTACK_HOSTNAME;

  if (!localStackHost && process.env.NODE_ENV === "development") {
    localStackHost = "localhost";
  }

  return localStackHost
    ? { endpoint: `http://${localStackHost}:4566`, forcePathStyle: true }
    : {}; // Use default AWS SDK behavior if localstack is not available
};

// Set up AWS clients
let s3Client: S3Client | null = null;
const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client(getS3Config());
  }
  return s3Client;
};

// Helper function to convert a readable stream to a buffer
export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

// Helper function to retrieve an image from S3
export const getImageFromS3 = async (
  bucket: string,
  key: string,
): Promise<Buffer> => {
  const params = {
    Bucket: bucket,
    Key: key,
  };

  const response = await getS3Client().send(new GetObjectCommand(params));
  return Buffer.from(await streamToBuffer(response.Body as Readable));
};

// Helper function to resize an image using Sharp
export const resizeImage = async (imageBuffer: Buffer): Promise<Buffer> => {
  logger.info("Resizing Image");
  const image = sharp(imageBuffer);
  logger.info("Sharp Initialized");
  const resizedImageBuffer = await image
    .resize(124, 80, {
      fit: "cover",
      position: "top",
    })
    .jpeg({ quality: 80 })
    .toBuffer();
  logger.info("Sharp Image Resize Complete");
  return resizedImageBuffer;
};

// Helper function to save an image to S3
export const saveImageToS3 = async (
  bucket: string,
  key: string,
  data: Buffer,
): Promise<void> => {
  const params = {
    Bucket: bucket,
    Key: key,
    Body: data,
    ContentType: getContentType(key),
  };
  await getS3Client().send(new PutObjectCommand(params));
};

// Helper function to check if the key represents a thumbnail
export const isThumbnailKey = (key: string): boolean => {
  return key.includes("thumbnail") || key.includes("thumbs");
};

// Helper function to check if the key represents an image (you may need to adjust this)
export const isImageKey = (key: string): boolean => {
  const supportedExtensions = [".jpg", ".jpeg", ".png", ".gif"];
  const ext = key.slice(key.lastIndexOf("."));
  return supportedExtensions.includes(ext.toLowerCase());
};

// Helper function to match the image format to the content type
export const getContentType = (key: string): string => {
  const supportedExtensions: { [key: string]: string } = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
  };
  const ext = key.slice(key.lastIndexOf("."));
  return supportedExtensions[ext.toLowerCase()] || "application/octet-stream";
};
