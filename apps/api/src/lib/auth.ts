import type { FastifyInstance } from "fastify";
import { User } from "../models";
import { AppError } from "./errors";
import type { TokenPayload } from "../types/fastify";

export function registerAuth(app: FastifyInstance) {
  app.decorate("authenticate", async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, "Please sign in again", "UNAUTHORIZED");
    }

    const payload = request.user as TokenPayload;
    if (payload.role !== "user" || !payload.userId || !payload.coupleId) {
      throw new AppError(401, "Invalid session", "INVALID_SESSION");
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError(401, "User no longer exists", "USER_NOT_FOUND");
    }

    if (user.status === "blocked") {
      throw new AppError(403, "This account is blocked", "USER_BLOCKED");
    }

    request.currentUser = user;
    request.coupleId = payload.coupleId;
    request.currentPayload = payload;
  });

  app.decorate("requireAdmin", async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, "Admin sign in required", "ADMIN_UNAUTHORIZED");
    }

    const payload = request.user as TokenPayload;
    if (payload.role !== "admin") {
      throw new AppError(403, "Admin access required", "ADMIN_FORBIDDEN");
    }
    request.currentPayload = payload;
  });
}

export function signUserToken(app: FastifyInstance, user: { id: string; coupleId: unknown }) {
  return app.jwt.sign({
    role: "user",
    userId: user.id,
    coupleId: String(user.coupleId)
  });
}

export function signAdminToken(app: FastifyInstance, email: string) {
  return app.jwt.sign({
    role: "admin",
    email
  });
}
