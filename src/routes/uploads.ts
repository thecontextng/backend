import { randomUUID } from "crypto";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { asyncHandler } from "../asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { getS3Client, getS3Config } from "../s3";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed"));
      return;
    }
    cb(null, true);
  },
});

function runUploadMiddleware(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single("file")(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export const uploadsRouter = Router();

uploadsRouter.post(
  "/",
  authenticate,
  requireRole("admin", "editor", "author"),
  asyncHandler(async (req, res) => {
    const config = getS3Config();
    if (!config) {
      res.status(503).json({
        error: "S3 is not configured. Set the AWS_* environment variables — see AWS_S3_SETUP.md.",
      });
      return;
    }

    try {
      await runUploadMiddleware(req, res);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "Upload failed" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const extension = req.file.originalname.split(".").pop()?.toLowerCase() || "jpg";
    const key = `articles/${randomUUID()}.${extension}`;
    const client = getS3Client(config);

    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );

    res.status(201).json({ key, url: `${config.publicUrl}/${key}` });
  })
);

uploadsRouter.delete(
  "/",
  authenticate,
  requireRole("admin", "editor", "author"),
  asyncHandler(async (req, res) => {
    const config = getS3Config();
    if (!config) {
      res.status(503).json({
        error: "S3 is not configured. Set the AWS_* environment variables — see AWS_S3_SETUP.md.",
      });
      return;
    }

    const { key } = req.body ?? {};
    if (!key || typeof key !== "string") {
      res.status(400).json({ error: "key is required" });
      return;
    }

    const client = getS3Client(config);
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    res.status(204).send();
  })
);
