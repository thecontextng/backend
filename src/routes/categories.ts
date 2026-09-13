import { Router } from "express";
import type { PoolClient } from "pg";
import { asyncHandler } from "../asyncHandler";
import { pool } from "../db";
import { slugify } from "../lib/slugify";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

export const categoriesRouter = Router();

async function findUniqueCategorySlug(
  client: PoolClient,
  base: string,
  excludeId?: string
): Promise<string> {
  const candidateBase = slugify(base);
  if (!candidateBase) {
    throw Object.assign(new Error("Unable to generate a slug from name"), {
      statusCode: 400,
    });
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? candidateBase : `${candidateBase}-${attempt + 1}`;
    const result = await client.query(
      excludeId
        ? "SELECT 1 FROM categories WHERE slug = $1 AND id != $2"
        : "SELECT 1 FROM categories WHERE slug = $1",
      excludeId ? [candidate, excludeId] : [candidate]
    );
    if (result.rowCount === 0) {
      return candidate;
    }
  }

  throw Object.assign(new Error("Could not generate a unique slug"), {
    statusCode: 409,
  });
}

categoriesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const result = await pool.query(
      "SELECT id, name, slug FROM categories ORDER BY name ASC"
    );
    res.json(result.rows);
  })
);

categoriesRouter.post(
  "/",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { name, slug } = req.body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const client = await pool.connect();
    try {
      const finalSlug = await findUniqueCategorySlug(client, slug || name);

      const result = await client.query(
        "INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id, name, slug",
        [name.trim(), finalSlug]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        res.status(409).json({ error: "A category with that slug already exists" });
        return;
      }
      throw err;
    } finally {
      client.release();
    }
  })
);

categoriesRouter.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { name, slug } = req.body ?? {};

    const client = await pool.connect();
    try {
      const finalSlug = slug
        ? await findUniqueCategorySlug(client, slug, req.params.id)
        : undefined;

      const result = await client.query(
        `UPDATE categories
         SET name = COALESCE($1, name),
             slug = COALESCE($2, slug)
         WHERE id = $3
         RETURNING id, name, slug`,
        [name?.trim(), finalSlug, req.params.id]
      );

      if (result.rowCount === 0) {
        res.status(404).json({ error: "Category not found" });
        return;
      }
      res.json(result.rows[0]);
    } catch (err) {
      if ((err as { code?: string }).code === "23505") {
        res.status(409).json({ error: "A category with that slug already exists" });
        return;
      }
      throw err;
    } finally {
      client.release();
    }
  })
);

categoriesRouter.delete(
  "/:id",
  authenticate,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const result = await pool.query("DELETE FROM categories WHERE id = $1", [
      req.params.id,
    ]);

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.status(204).send();
  })
);
