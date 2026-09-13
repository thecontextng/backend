import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { pool } from "./db";
import { articlesRouter } from "./routes/articles";
import { authRouter } from "./routes/auth";
import { categoriesRouter } from "./routes/categories";
import { uploadsRouter } from "./routes/uploads";
import { usersRouter } from "./routes/users";

const app = express();
const port = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/health/db", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "error", message: (err as Error).message });
  }
});

app.use("/users", usersRouter);
app.use("/auth", authRouter);
app.use("/categories", categoriesRouter);
app.use("/articles", articlesRouter);
app.use("/uploads", uploadsRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode =
    typeof err === "object" && err !== null && "statusCode" in err
      ? Number((err as { statusCode?: unknown }).statusCode)
      : undefined;

  if (statusCode && statusCode >= 400 && statusCode < 500) {
    res.status(statusCode).json({ error: (err as Error).message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
