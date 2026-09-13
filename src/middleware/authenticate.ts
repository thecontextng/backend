import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "../jwt";

const rawSecret = process.env.JWT_SECRET;

if (!rawSecret) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const JWT_SECRET: string = rawSecret;

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const user = tryAuthenticate(req);

  if (!user) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  req.user = user;
  next();
}

export function tryAuthenticate(req: Request): AuthTokenPayload | null {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as unknown as AuthTokenPayload;
  } catch {
    return null;
  }
}
