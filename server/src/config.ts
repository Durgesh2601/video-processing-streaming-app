import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  PORT: z.string().default("4000"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  CLIENT_URLS: z.string().optional(),
  JWT_SECRET: z.string().min(8).default("replace-me"),
  MONGODB_URI: z.string().default("mongodb://127.0.0.1:27017/video-platform"),
  UPLOAD_DIR: z.string().default("./uploads"),
});

const parsed = schema.parse(process.env);

const configuredOrigins = [
  parsed.CLIENT_URL,
  ...(parsed.CLIENT_URLS
    ? parsed.CLIENT_URLS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : []),
];

export const config = {
  port: Number(parsed.PORT),
  clientUrl: parsed.CLIENT_URL,
  allowedOrigins: Array.from(
    new Set([
      ...configuredOrigins,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]),
  ),
  jwtSecret: parsed.JWT_SECRET,
  mongoUri: parsed.MONGODB_URI,
  uploadDir: path.resolve(process.cwd(), parsed.UPLOAD_DIR),
};
