import { S3Client } from "@aws-sdk/client-s3";

interface S3Config {
  region: string;
  bucket: string;
  publicUrl: string;
  // Only set outside Lambda (Render, local dev). On Lambda, AWS_ACCESS_KEY_ID/
  // AWS_SECRET_ACCESS_KEY/AWS_REGION are reserved and auto-provided from the
  // function's execution role — omitting `credentials` lets the SDK's default
  // provider chain pick those up instead.
  accessKeyId?: string;
  secretAccessKey?: string;
}

let cachedClient: S3Client | null = null;

export function getS3Config(): S3Config | null {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;

  if (!region || !bucket) {
    return null;
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const publicUrl =
    process.env.AWS_S3_PUBLIC_URL || `https://${bucket}.s3.${region}.amazonaws.com`;

  return { region, bucket, publicUrl, accessKeyId, secretAccessKey };
}

export function getS3Client(config: S3Config): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey
        ? {
            credentials: {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            },
          }
        : {}),
    });
  }
  return cachedClient;
}
