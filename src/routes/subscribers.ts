import { Router } from "express";
import { asyncHandler } from "../asyncHandler";
import { pool } from "../db";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

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

subscribersRouter.get(
  "/",
  authenticate,
  requireRole("admin", "editor"),
  asyncHandler(async (_req, res) => {
    const result = await pool.query(
      "SELECT id, email, created_at FROM newsletter_subscribers ORDER BY created_at DESC"
    );
    res.json(result.rows);
  })
);

subscribersRouter.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const result = await pool.query("DELETE FROM newsletter_subscribers WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Subscriber not found" });
      return;
    }
    res.status(204).send();
  })
);
