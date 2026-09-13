import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "./db";

const ROLES = ["admin", "editor", "author"] as const;
const SEED_PASSWORD = "password123";

const CATEGORIES = [
  { name: "AI & Tech Innovations", slug: "ai-tech-innovations" },
  { name: "Climate & Environment", slug: "climate-environment" },
  { name: "Health & Human Stories", slug: "health-human-stories" },
  { name: "Video Reports", slug: "video-reports" },
  { name: "Documentaries", slug: "documentaries" },
] as const;

async function seed() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const role of ROLES) {
    const email = `${role}@example.com`;
    const name = `${role[0].toUpperCase()}${role.slice(1)} User`;

    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           updated_at = now()`,
      [email, passwordHash, name, role]
    );

    console.log(`Seeded ${role} -> ${email} / ${SEED_PASSWORD}`);
  }

  for (const category of CATEGORIES) {
    await pool.query(
      `INSERT INTO categories (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name`,
      [category.name, category.slug]
    );

    console.log(`Seeded category -> ${category.name} (${category.slug})`);
  }

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
