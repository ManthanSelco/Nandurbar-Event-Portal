import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import s3Client from "../../config/s3.js";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

if (!BUCKET_NAME) {
  throw new Error("AWS_S3_BUCKET_NAME is not configured");
}

/**
 * Upload a file to private S3 storage.
 */
export const uploadToS3 = async ({
  buffer,
  fileName,
  contentType,
  participantId,
  docType,
}) => {
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

  const fileKey = [
    "participants",
    participantId,
    "assessment",
    docType,
    `${Date.now()}-${safeFileName}`,
  ].join("/");

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return fileKey;
};

/**
 * Generate a temporary URL for a private S3 file.
 */
export const getS3SignedUrl = async (fileKey) => {
  if (!fileKey) {
    return null;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });
};

/**
 * Delete a file from S3.
 */
export const deleteFromS3 = async (fileKey) => {
  if (!fileKey) {
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  await s3Client.send(command);
};