import { Router } from "express";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { asyncHandler } from "../asyncHandler";
import { pool } from "../db";
import { slugify } from "../lib/slugify";
import { authenticate, tryAuthenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

export const articlesRouter = Router();

const STATUSES = ["draft", "published", "archived"] as const;
type Status = (typeof STATUSES)[number];

const MEDIA_TYPES = ["image", "video"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

interface MediaInput {
  type: MediaType;
  url: string;
  caption?: string;
}

const LIST_FIELDS = `
  articles.id,
  articles.title,
  articles.slug,
  articles.excerpt,
  articles.featured_image_url,
  articles.status,
  articles.author_id,
  articles.published_at,
  users.name AS author_name,
  categories.name AS category_name,
  categories.slug AS category_slug,
  (
    SELECT url FROM article_media
    WHERE article_media.article_id = articles.id AND article_media.type = 'video'
    ORDER BY article_media.position ASC
    LIMIT 1
  ) AS video_url
`;

const DETAIL_FIELDS = `
  articles.id,
  articles.title,
  articles.slug,
  articles.excerpt,
  articles.content,
  articles.featured_image_url,
  articles.seo_title,
  articles.seo_description,
  articles.tags,
  articles.status,
  articles.published_at,
  articles.author_id,
  articles.category_id,
  articles.created_at,
  articles.updated_at,
  users.name AS author_name,
  categories.name AS category_name,
  categories.slug AS category_slug
`;

interface Queryable {
  query<T extends QueryResultRow = any>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
}

async function fetchArticleWithMedia(client: Queryable, id: string) {
  const articleResult = await client.query(
    `SELECT ${DETAIL_FIELDS}
     FROM articles
     JOIN users ON users.id = articles.author_id
     LEFT JOIN categories ON categories.id = articles.category_id
     WHERE articles.id = $1`,
    [id]
  );

  if (articleResult.rowCount === 0) {
    return null;
  }

  const mediaResult = await client.query(
    `SELECT id, type, url, caption, position
     FROM article_media
     WHERE article_id = $1
     ORDER BY position ASC, created_at ASC`,
    [id]
  );

  return { ...articleResult.rows[0], media: mediaResult.rows };
}

async function findUniqueSlug(
  client: PoolClient,
  base: string,
  excludeId?: string
): Promise<string> {
  const candidateBase = slugify(base);
  if (!candidateBase) {
    throw Object.assign(new Error("Unable to generate a slug from title"), {
      statusCode: 400,
    });
  }

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? candidateBase : `${candidateBase}-${attempt + 1}`;
    const result = await client.query(
      excludeId
        ? "SELECT 1 FROM articles WHERE slug = $1 AND id != $2"
        : "SELECT 1 FROM articles WHERE slug = $1",
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

function validateMedia(media: unknown): MediaInput[] {
  if (media === undefined) return [];
  if (!Array.isArray(media)) {
    throw Object.assign(new Error("media must be an array"), { statusCode: 400 });
  }

  return media.map((rawItem, index) => {
    const item = rawItem as { type?: unknown; url?: unknown; caption?: unknown } | null;
    if (
      !item ||
      typeof item !== "object" ||
      !MEDIA_TYPES.includes(item.type as MediaType) ||
      typeof item.url !== "string" ||
      !item.url
    ) {
      throw Object.assign(
        new Error(`media[${index}] must have a valid type ("image" or "video") and a url`),
        { statusCode: 400 }
      );
    }
    return {
      type: item.type as MediaType,
      url: item.url,
      caption: typeof item.caption === "string" ? item.caption : undefined,
    };
  });
}

async function replaceMedia(client: PoolClient, articleId: string, media: MediaInput[]) {
  await client.query("DELETE FROM article_media WHERE article_id = $1", [articleId]);

  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    await client.query(
      `INSERT INTO article_media (article_id, type, url, caption, position)
       VALUES ($1, $2, $3, $4, $5)`,
      [articleId, item.type, item.url, item.caption ?? null, i]
    );
  }
}

// --- Public routes (no auth required, but auth is read if present) ---

articlesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const mine = req.query.mine === "true";
    const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
    const search = typeof req.query.q === "string" ? req.query.q.trim() : undefined;

    const user = tryAuthenticate(req);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (mine) {
      if (!user) {
        res.status(401).json({ error: "Missing or invalid Authorization header" });
        return;
      }
      params.push(user.sub);
      conditions.push(`articles.author_id = $${params.length}`);

      if (statusFilter) {
        if (!STATUSES.includes(statusFilter as Status)) {
          res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
          return;
        }
        params.push(statusFilter);
        conditions.push(`articles.status = $${params.length}`);
      }
    } else if (statusFilter) {
      const isManager = user?.role === "admin" || user?.role === "editor";
      if (!isManager) {
        res.status(403).json({ error: "Only editors or admins can filter by status" });
        return;
      }
      if (statusFilter !== "all" && !STATUSES.includes(statusFilter as Status)) {
        res.status(400).json({ error: `status must be one of: all, ${STATUSES.join(", ")}` });
        return;
      }
      if (statusFilter !== "all") {
        params.push(statusFilter);
        conditions.push(`articles.status = $${params.length}`);
      }
    } else {
      conditions.push("articles.status = 'published'", "articles.published_at <= now()");
    }

    if (category) {
      params.push(category);
      conditions.push(`categories.slug = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      const searchParam = `$${params.length}`;
      conditions.push(
        `(articles.title ILIKE ${searchParam}
          OR articles.excerpt ILIKE ${searchParam}
          OR EXISTS (SELECT 1 FROM unnest(articles.tags) tag WHERE tag ILIKE ${searchParam}))`
      );
    }

    params.push(limit);
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const result = await pool.query(
      `SELECT ${LIST_FIELDS}
       FROM articles
       JOIN users ON users.id = articles.author_id
       LEFT JOIN categories ON categories.id = articles.category_id
       WHERE ${conditions.length > 0 ? conditions.join(" AND ") : "TRUE"}
       ORDER BY COALESCE(articles.published_at, articles.created_at) DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params
    );

    res.json(result.rows);
  })
);

// Fetch by id regardless of status, for the admin/editor/author edit view.
articlesRouter.get(
  "/id/:id",
  authenticate,
  requireRole("admin", "editor", "author"),
  asyncHandler(async (req, res) => {
    const article = await fetchArticleWithMedia(pool, req.params.id);

    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    const isManager = req.user!.role === "admin" || req.user!.role === "editor";
    if (!isManager && article.author_id !== req.user!.sub) {
      res.status(403).json({ error: "You can only view your own articles" });
      return;
    }

    res.json(article);
  })
);

articlesRouter.get(
  "/stats",
  authenticate,
  requireRole("admin", "editor"),
  asyncHandler(async (_req, res) => {
    const [totalResult, statusResult, categoryResult, monthResult, authorResult, mediaResult] =
      await Promise.all([
        pool.query<{ total: string }>("SELECT count(*) AS total FROM articles"),
        pool.query<{ status: Status; count: string }>(
          "SELECT status, count(*) AS count FROM articles GROUP BY status"
        ),
        pool.query<{ name: string; slug: string; count: string }>(
          `SELECT categories.name, categories.slug, count(articles.id) AS count
           FROM categories
           LEFT JOIN articles ON articles.category_id = categories.id
           GROUP BY categories.id, categories.name, categories.slug
           ORDER BY categories.name ASC`
        ),
        pool.query<{ month: string; count: string }>(
          `SELECT to_char(date_trunc('month', published_at), 'Mon YYYY') AS month, count(*) AS count
           FROM articles
           WHERE published_at IS NOT NULL
           GROUP BY date_trunc('month', published_at)
           ORDER BY date_trunc('month', published_at) ASC`
        ),
        pool.query<{ name: string; count: string }>(
          `SELECT users.name, count(articles.id) AS count
           FROM articles
           JOIN users ON users.id = articles.author_id
           GROUP BY users.id, users.name
           ORDER BY count(articles.id) DESC
           LIMIT 5`
        ),
        pool.query<{ type: MediaType; count: string }>(
          "SELECT type, count(*) AS count FROM article_media GROUP BY type"
        ),
      ]);

    const statusCounts = new Map<Status, number>(STATUSES.map((status) => [status, 0]));
    for (const row of statusResult.rows) {
      statusCounts.set(row.status, Number(row.count));
    }

    const mediaCounts = new Map<MediaType, number>(MEDIA_TYPES.map((type) => [type, 0]));
    for (const row of mediaResult.rows) {
      mediaCounts.set(row.type, Number(row.count));
    }

    res.json({
      total: Number(totalResult.rows[0]?.total ?? 0),
      byStatus: STATUSES.map((status) => ({ status, count: statusCounts.get(status)! })),
      byCategory: categoryResult.rows.map((row) => ({
        name: row.name,
        slug: row.slug,
        count: Number(row.count),
      })),
      byMonth: monthResult.rows.map((row) => ({ month: row.month, count: Number(row.count) })),
      topAuthors: authorResult.rows.map((row) => ({ name: row.name, count: Number(row.count) })),
      mediaMix: MEDIA_TYPES.map((type) => ({ type, count: mediaCounts.get(type)! })),
    });
  })
);

articlesRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const result = await pool.query(
      `SELECT
         articles.id,
         articles.title,
         articles.slug,
         articles.excerpt,
         articles.content,
         articles.featured_image_url,
         articles.seo_title,
         articles.seo_description,
         articles.tags,
         articles.published_at,
         users.name AS author_name,
         categories.name AS category_name,
         categories.slug AS category_slug
       FROM articles
       JOIN users ON users.id = articles.author_id
       LEFT JOIN categories ON categories.id = articles.category_id
       WHERE articles.slug = $1
         AND articles.status = 'published'
         AND articles.published_at <= now()`,
      [req.params.slug]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    const article = result.rows[0];

    const mediaResult = await pool.query(
      `SELECT id, type, url, caption, position
       FROM article_media
       WHERE article_id = $1
       ORDER BY position ASC, created_at ASC`,
      [article.id]
    );

    res.json({ ...article, media: mediaResult.rows });
  })
);

// --- Managed routes (admin, editor, author) ---

articlesRouter.post(
  "/",
  authenticate,
  requireRole("admin", "editor", "author"),
  asyncHandler(async (req, res) => {
    const {
      title,
      slug: requestedSlug,
      excerpt,
      content,
      category_id,
      featured_image_url,
      seo_title,
      seo_description,
      tags,
      status: requestedStatus,
      published_at: requestedPublishedAt,
      author_id: requestedAuthorId,
      media: requestedMedia,
    } = req.body ?? {};

    if (!title || !content) {
      res.status(400).json({ error: "title and content are required" });
      return;
    }

    if (requestedStatus !== undefined && !STATUSES.includes(requestedStatus)) {
      res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
      return;
    }

    const isManager = req.user!.role === "admin" || req.user!.role === "editor";

    if (!isManager && requestedStatus && requestedStatus !== "draft") {
      res.status(403).json({ error: "Only editors or admins can publish articles" });
      return;
    }

    const authorId = isManager && requestedAuthorId ? requestedAuthorId : req.user!.sub;
    const status: Status = (requestedStatus as Status) ?? "draft";
    const media = validateMedia(requestedMedia);
    const tagList = Array.isArray(tags) ? tags.map(String) : [];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const slug = await findUniqueSlug(client, requestedSlug || title);
      const publishedAt =
        status === "published" ? requestedPublishedAt ?? new Date().toISOString() : requestedPublishedAt ?? null;

      const insertResult = await client.query(
        `INSERT INTO articles (
           title, slug, excerpt, content, author_id, category_id,
           status, published_at, featured_image_url, seo_title, seo_description, tags
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          title,
          slug,
          excerpt ?? null,
          content,
          authorId,
          category_id ?? null,
          status,
          publishedAt,
          featured_image_url ?? null,
          seo_title ?? title,
          seo_description ?? excerpt ?? null,
          tagList,
        ]
      );

      const articleId = insertResult.rows[0].id;
      await replaceMedia(client, articleId, media);

      const article = await fetchArticleWithMedia(client, articleId);
      await client.query("COMMIT");

      res.status(201).json(article);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

articlesRouter.patch(
  "/:id",
  authenticate,
  requireRole("admin", "editor", "author"),
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existingResult = await client.query(
        "SELECT id, author_id, status FROM articles WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );

      if (existingResult.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Article not found" });
        return;
      }

      const existing = existingResult.rows[0];
      const isManager = req.user!.role === "admin" || req.user!.role === "editor";
      const isOwner = existing.author_id === req.user!.sub;

      if (!isManager && !isOwner) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You can only edit your own articles" });
        return;
      }

      if (!isManager && existing.status !== "draft") {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "This article has left draft status; ask an editor or admin to change it",
        });
        return;
      }

      const {
        title,
        slug: requestedSlug,
        excerpt,
        content,
        category_id,
        featured_image_url,
        seo_title,
        seo_description,
        tags,
        status: requestedStatus,
        published_at: requestedPublishedAt,
        author_id: requestedAuthorId,
        media: requestedMedia,
      } = req.body ?? {};

      if (requestedStatus !== undefined && !STATUSES.includes(requestedStatus)) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: `status must be one of: ${STATUSES.join(", ")}` });
        return;
      }

      if (!isManager && requestedStatus && requestedStatus !== "draft") {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Only editors or admins can publish articles" });
        return;
      }

      const slug = requestedSlug
        ? await findUniqueSlug(client, requestedSlug, existing.id)
        : undefined;

      const willPublishNow = requestedStatus === "published" && existing.status !== "published";
      const publishedAt = willPublishNow
        ? requestedPublishedAt ?? new Date().toISOString()
        : requestedPublishedAt;

      await client.query(
        `UPDATE articles SET
           title = COALESCE($1, title),
           slug = COALESCE($2, slug),
           excerpt = COALESCE($3, excerpt),
           content = COALESCE($4, content),
           category_id = COALESCE($5, category_id),
           status = COALESCE($6, status),
           published_at = COALESCE($7, published_at),
           featured_image_url = COALESCE($8, featured_image_url),
           seo_title = COALESCE($9, seo_title),
           seo_description = COALESCE($10, seo_description),
           tags = COALESCE($11, tags),
           author_id = COALESCE($12, author_id),
           updated_at = now()
         WHERE id = $13`,
        [
          title ?? null,
          slug ?? null,
          excerpt ?? null,
          content ?? null,
          category_id ?? null,
          requestedStatus ?? null,
          publishedAt ?? null,
          featured_image_url ?? null,
          seo_title ?? null,
          seo_description ?? null,
          Array.isArray(tags) ? tags.map(String) : null,
          isManager && requestedAuthorId ? requestedAuthorId : null,
          existing.id,
        ]
      );

      if (requestedMedia !== undefined) {
        const media = validateMedia(requestedMedia);
        await replaceMedia(client, existing.id, media);
      }

      const article = await fetchArticleWithMedia(client, existing.id);
      await client.query("COMMIT");

      res.json(article);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

articlesRouter.delete(
  "/:id",
  authenticate,
  requireRole("admin", "editor", "author"),
  asyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const existingResult = await client.query(
        "SELECT id, author_id, status FROM articles WHERE id = $1 FOR UPDATE",
        [req.params.id]
      );

      if (existingResult.rowCount === 0) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Article not found" });
        return;
      }

      const existing = existingResult.rows[0];
      const isManager = req.user!.role === "admin" || req.user!.role === "editor";
      const isOwner = existing.author_id === req.user!.sub;

      if (!isManager && !isOwner) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You can only delete your own articles" });
        return;
      }

      if (!isManager && existing.status !== "draft") {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "This article has left draft status; ask an editor or admin to delete it",
        });
        return;
      }

      await client.query("DELETE FROM articles WHERE id = $1", [existing.id]);
      await client.query("COMMIT");

      res.status(204).send();
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);
