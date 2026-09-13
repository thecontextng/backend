import { S3Client } from "@aws-sdk/client-s3";

interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

let cachedClient: S3Client | null = null;

export function getS3Config(): S3Config | null {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET;

  if (!region || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  const publicUrl =
    process.env.AWS_S3_PUBLIC_URL || `https://${bucket}.s3.${region}.amazonaws.com`;

  return { region, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function getS3Client(config: S3Config): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return cachedClient;
}
