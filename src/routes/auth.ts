import bcrypt from "bcryptjs";
import { Router } from "express";
import { asyncHandler } from "../asyncHandler";
import { pool } from "../db";
import { signAuthToken } from "../jwt";
import { authenticate } from "../middleware/authenticate";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const result = await pool.query(
      "SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const { password_hash, ...publicUser } = user;
    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({ token, user: publicUser });
  })
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      "SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1",
      [req.user!.sub]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(result.rows[0]);
  })
);
