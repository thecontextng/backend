import { Router } from "express";
import { asyncHandler } from "../asyncHandler";
import { pool } from "../db";

export const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const result = await pool.query(
      "SELECT id, name, slug FROM categories ORDER BY name ASC"
    );
    res.json(result.rows);
  })
);
