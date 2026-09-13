import { Router } from "express";
import { asyncHandler } from "../asyncHandler";
import { pool } from "../db";

export const subscribersRouter = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

subscribersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { email } = req.body ?? {};

    if (!email || typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
      res.status(400).json({ error: "A valid email is required" });
      return;
    }

    await pool.query(
      `INSERT INTO newsletter_subscribers (email)
       VALUES ($1)
       ON CONFLICT (email) DO NOTHING`,
      [email.trim().toLowerCase()]
    );

    res.status(201).json({ status: "subscribed" });
  })
);
