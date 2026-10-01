import { S3Client } from "@aws-sdk/client-s3";

interface S3Config {
  region: string;
  bucket: string;
  publicUrl: string;
  // Only set outside Lambda (Render, local dev) using a long-term IAM user
  // key. On Lambda, AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY are reserved and
  // auto-provided from the function's execution role — but as *temporary*
  // credentials, which also require AWS_SESSION_TOKEN to be valid. Rather
  // than reconstruct that triple ourselves, we detect the session token and
  // omit `credentials` entirely so the SDK's own default provider chain
  // (which handles the Lambda case correctly) picks the right credentials.
  accessKeyId?: string;
  secretAccessKey?: string;
  isTemporary: boolean;
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
  const isTemporary = Boolean(process.env.AWS_SESSION_TOKEN);
  const publicUrl =
    process.env.AWS_S3_PUBLIC_URL || `https://${bucket}.s3.${region}.amazonaws.com`;

  return { region, bucket, publicUrl, accessKeyId, secretAccessKey, isTemporary };
}

export function getS3Client(config: S3Config): S3Client {
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: config.region,
      ...(config.accessKeyId && config.secretAccessKey && !config.isTemporary
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
