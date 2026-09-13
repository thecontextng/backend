/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.addColumns("articles", {
    featured_image_url: { type: "text" },
    seo_title: { type: "text" },
    seo_description: { type: "text" },
    tags: { type: "text[]", notNull: true, default: "{}" },
  });

  pgm.addConstraint("articles", "articles_status_check", {
    check: "status IN ('draft', 'published', 'archived')",
  });

  pgm.createTable("article_media", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    article_id: {
      type: "uuid",
      notNull: true,
      references: "articles",
      onDelete: "cascade",
    },
    type: { type: "text", notNull: true },
    url: { type: "text", notNull: true },
    caption: { type: "text" },
    position: { type: "integer", notNull: true, default: 0 },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.addConstraint("article_media", "article_media_type_check", {
    check: "type IN ('image', 'video')",
  });

  pgm.createIndex("article_media", "article_id");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable("article_media");
  pgm.dropConstraint("articles", "articles_status_check");
  pgm.dropColumns("articles", [
    "featured_image_url",
    "seo_title",
    "seo_description",
    "tags",
  ]);
};
