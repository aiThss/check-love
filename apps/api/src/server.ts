import "dotenv/config";
import path from "node:path";
import fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { env } from "./config/env";
import { connectDb } from "./db";
import { formatError } from "./lib/errors";
import { registerAuth } from "./lib/auth";
import { ensureUploadDir } from "./lib/uploads";
import { configureWebPush } from "./lib/notifications";
import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { checkInRoutes } from "./routes/checkins";
import { randomRoutes } from "./routes/random";
import { pushRoutes } from "./routes/push";
import { adminRoutes } from "./routes/admin";

async function buildServer() {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug"
    },
    bodyLimit: env.MAX_UPLOAD_MB * 1024 * 1024
  });

  await ensureUploadDir();
  configureWebPush();

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGINS.includes("*") || env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true
  });

  await app.register(rateLimit, {
    max: 180,
    timeWindow: "1 minute"
  });
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
      files: 2
    }
  });
  await app.register(fastifyStatic, {
    root: path.resolve(env.UPLOAD_DIR),
    prefix: "/uploads/"
  });

  registerAuth(app);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const formatted = formatError(error);
    reply.status(formatted.statusCode).send(formatted.body);
  });

  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(meRoutes, { prefix: "/api" });
  await app.register(checkInRoutes, { prefix: "/api" });
  await app.register(randomRoutes, { prefix: "/api" });
  await app.register(pushRoutes, { prefix: "/api" });
  await app.register(adminRoutes, { prefix: "/api" });

  return app;
}

async function main() {
  await connectDb();
  const app = await buildServer();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
