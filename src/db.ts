import { Pool } from "pg";

// Tie SSL to whether we're actually connecting to a remote host, not to
// NODE_ENV — Render (and most managed Postgres) requires SSL on every
// non-local connection, and relying on NODE_ENV being set correctly on the
// hosting platform is a common way to silently lose this.
function isLocalConnection(connectionString: string | undefined): boolean {
  if (!connectionString) return true;
  try {
    const { hostname } = new URL(connectionString);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return true;
  }
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocalConnection(process.env.DATABASE_URL) ? undefined : { rejectUnauthorized: false },
});
