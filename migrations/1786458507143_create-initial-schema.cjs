/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.createExtension("pgcrypto", { ifNotExists: true });

  pgm.createTable("users", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    email: { type: "text", notNull: true, unique: true },
    password_hash: { type: "text", notNull: true },
    name: { type: "text", notNull: true },
    role: { type: "text", notNull: true, default: "author" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("categories", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    name: { type: "text", notNull: true },
    slug: { type: "text", notNull: true, unique: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("articles", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    title: { type: "text", notNull: true },
    slug: { type: "text", notNull: true, unique: true },
    excerpt: { type: "text" },
    content: { type: "text", notNull: true },
    author_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "restrict",
    },
    category_id: {
      type: "uuid",
      references: "categories",
      onDelete: "set null",
    },
    status: { type: "text", notNull: true, default: "draft" },
    published_at: { type: "timestamptz" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createIndex("articles", "author_id");
  pgm.createIndex("articles", "category_id");
  pgm.createIndex("articles", "status");
  pgm.createIndex("articles", "published_at");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropTable("articles");
  pgm.dropTable("categories");
  pgm.dropTable("users");
};
