import bcrypt from "bcryptjs";
import { Router } from "express";
import { asyncHandler } from "../asyncHandler";
import { pool } from "../db";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

export const usersRouter = Router();

usersRouter.use(authenticate);

const PUBLIC_COLUMNS = "id, email, name, role, created_at, updated_at";

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const result = await pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  })
);

usersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(result.rows[0]);
  })
);

usersRouter.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body ?? {};

    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password, and name are required" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, COALESCE($4, 'author'))
         RETURNING ${PUBLIC_COLUMNS}`,
        [email, passwordHash, name, role]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        res.status(409).json({ error: "Email already in use" });
        return;
      }
      throw err;
    }
  })
);

usersRouter.patch(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { name, role } = req.body ?? {};

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           role = COALESCE($2, role),
           updated_at = now()
       WHERE id = $3
       RETURNING ${PUBLIC_COLUMNS}`,
      [name, role, req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(result.rows[0]);
  })
);

usersRouter.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const result = await pool.query("DELETE FROM users WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.status(204).send();
  })
);
