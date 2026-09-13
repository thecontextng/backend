import jwt from "jsonwebtoken";

const rawSecret = process.env.JWT_SECRET;

if (!rawSecret) {
  throw new Error("JWT_SECRET environment variable is not set");
}

const JWT_SECRET: string = rawSecret;

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
