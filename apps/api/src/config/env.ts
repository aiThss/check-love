import { z } from "zod";

const boolFromString = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}, z.boolean());

const intFromString = (fallback: number) =>
  z.preprocess((value) => {
    if (value === undefined || value === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }, z.number().int().positive());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: intFromString(4000),
  JWT_SECRET: z.string().min(24).default("dev-lovecheck-secret-change-this"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/lovecheck"),
  UPLOAD_DIR: z.string().min(1).default("uploads"),
  MAX_UPLOAD_MB: intFromString(10),
  PUBLIC_WEB_BASE_URL: z.string().url().default("http://localhost:5173"),
  PUBLIC_API_BASE_URL: z.string().url().default("http://localhost:4000"),
  PUBLIC_ADMIN_BASE_URL: z.string().url().default("http://localhost:5174"),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:5174"),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().min(1).default("change-me"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: intFromString(465),
  SMTP_SECURE: boolFromString.default(true),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  OTP_TTL_MINUTES: intFromString(10),
  REQUIRE_LOGIN_OTP: boolFromString.default(false),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional()
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  PUBLIC_API_BASE_URL: parsed.PUBLIC_API_BASE_URL.replace(/\/$/, ""),
  PUBLIC_WEB_BASE_URL: parsed.PUBLIC_WEB_BASE_URL.replace(/\/$/, ""),
  PUBLIC_ADMIN_BASE_URL: parsed.PUBLIC_ADMIN_BASE_URL.replace(/\/$/, ""),
  CORS_ORIGINS: parsed.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
};

export const isProduction = env.NODE_ENV === "production";
