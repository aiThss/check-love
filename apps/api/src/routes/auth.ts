import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Types } from "mongoose";
import { Couple, OtpCode, User } from "../models";
import { attachUserToCouple, findOrCreateCouple } from "../lib/couples";
import { AppError } from "../lib/errors";
import { createOtpCode, hashOtp, hashPassword, normalizeEmail, verifyOtp, verifyPassword } from "../lib/password";
import { sendOtpMail } from "../lib/mailer";
import { signAdminToken, signUserToken } from "../lib/auth";
import { env } from "../config/env";

const nameSchema = z.string().trim().min(1).max(64);
const passwordSchema = z.string().min(8).max(128);
const dateSchema = z.string().datetime().or(z.string().date());

const startSchema = z.object({
  displayName: nameSchema,
  partnerName: nameSchema,
  coupleCode: z.string().trim().min(3).max(40),
  loveStartDate: dateSchema.optional(),
  deviceName: z.string().trim().max(80).optional()
});

const requestCodeSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["register", "login"]).default("register")
});

const registerSchema = startSchema.extend({
  email: z.string().email(),
  password: passwordSchema,
  otpCode: z.string().trim().regex(/^\d{6}$/)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otpCode: z.string().trim().regex(/^\d{6}$/).optional()
});

function publicUser(user: any) {
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.displayName,
    partnerName: user.partnerName,
    email: user.email,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    partnerAvatarUrl: user.partnerAvatarUrl,
    role: user.role,
    status: user.status,
    coupleId: String(user.coupleId),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function publicCouple(couple: any) {
  if (!couple) return null;
  return {
    id: couple.id,
    code: couple.code,
    loveStartDate: couple.loveStartDate,
    memberIds: couple.memberIds.map(String),
    createdAt: couple.createdAt,
    updatedAt: couple.updatedAt
  };
}

async function verifyStoredOtp(email: string, purpose: "register" | "login", code: string) {
  const record = await OtpCode.findOne({
    email,
    purpose,
    consumedAt: { $exists: false }
  }).sort({ createdAt: -1 });

  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new AppError(400, "OTP code is expired or invalid", "OTP_INVALID");
  }

  if (record.attempts >= 5) {
    throw new AppError(429, "Too many OTP attempts", "OTP_TOO_MANY_ATTEMPTS");
  }

  const ok = await verifyOtp(code, record.codeHash);
  if (!ok) {
    record.attempts += 1;
    await record.save();
    throw new AppError(400, "OTP code is expired or invalid", "OTP_INVALID");
  }

  record.consumedAt = new Date();
  await record.save();
}

async function createUserForCouple(input: z.infer<typeof startSchema> & { email?: string; password?: string }) {
  const couple = await findOrCreateCouple(input.coupleCode, input.loveStartDate);
  const user = await User.create({
    displayName: input.displayName,
    partnerName: input.partnerName,
    email: input.email,
    passwordHash: input.password ? await hashPassword(input.password) : undefined,
    emailVerified: Boolean(input.email),
    trustedDevices: input.deviceName ? [input.deviceName] : [],
    coupleId: couple._id
  });
  const updatedCouple = await attachUserToCouple(couple._id, user._id as Types.ObjectId);
  return { user, couple: updatedCouple };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/request-code", { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } }, async (request) => {
    const body = requestCodeSchema.parse(request.body);
    const email = normalizeEmail(body.email);

    if (body.purpose === "register") {
      const existing = await User.findOne({ email });
      if (existing) {
        throw new AppError(409, "Email already has an account", "EMAIL_EXISTS");
      }
    }

    if (body.purpose === "login") {
      const existing = await User.findOne({ email, passwordHash: { $exists: true } });
      if (!existing) {
        throw new AppError(404, "Email account not found", "USER_NOT_FOUND");
      }
    }

    const code = createOtpCode();
    await OtpCode.create({
      email,
      purpose: body.purpose,
      codeHash: await hashOtp(code),
      expiresAt: new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000)
    });
    const mail = await sendOtpMail(email, code, body.purpose);

    return {
      ok: true,
      sent: mail.sent,
      devCode: env.NODE_ENV === "production" ? undefined : mail.sent ? undefined : code
    };
  });

  app.post("/auth/register", { config: { rateLimit: { max: 8, timeWindow: "10 minutes" } } }, async (request) => {
    const body = registerSchema.parse(request.body);
    const email = normalizeEmail(body.email);

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError(409, "Email already has an account", "EMAIL_EXISTS");
    }

    await verifyStoredOtp(email, "register", body.otpCode);
    const { user, couple } = await createUserForCouple({ ...body, email, password: body.password });

    return {
      token: signUserToken(app, user),
      user: publicUser(user),
      couple: publicCouple(couple)
    };
  });

  app.post("/auth/start", { config: { rateLimit: { max: 15, timeWindow: "10 minutes" } } }, async (request) => {
    const body = startSchema.parse(request.body);
    const { user, couple } = await createUserForCouple(body);

    return {
      token: signUserToken(app, user),
      user: publicUser(user),
      couple: publicCouple(couple)
    };
  });

  app.post("/auth/login", { config: { rateLimit: { max: 8, timeWindow: "10 minutes" } } }, async (request) => {
    const body = loginSchema.parse(request.body);
    const email = normalizeEmail(body.email);
    const user = await User.findOne({ email, passwordHash: { $exists: true } });

    if (!user || !user.passwordHash) {
      throw new AppError(401, "Email or password is incorrect", "INVALID_CREDENTIALS");
    }

    if (user.status === "blocked") {
      throw new AppError(403, "This account is blocked", "USER_BLOCKED");
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      throw new AppError(401, "Email or password is incorrect", "INVALID_CREDENTIALS");
    }

    if (env.REQUIRE_LOGIN_OTP) {
      if (!body.otpCode) {
        throw new AppError(400, "OTP code is required", "OTP_REQUIRED");
      }
      await verifyStoredOtp(email, "login", body.otpCode);
    }

    const couple = await Couple.findById(user.coupleId);
    return {
      token: signUserToken(app, user),
      user: publicUser(user),
      couple: publicCouple(couple)
    };
  });

  app.post("/admin/login", { config: { rateLimit: { max: 8, timeWindow: "10 minutes" } } }, async (request) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(request.body);
    if (normalizeEmail(body.email) !== normalizeEmail(env.ADMIN_EMAIL) || body.password !== env.ADMIN_PASSWORD) {
      throw new AppError(401, "Admin email or password is incorrect", "ADMIN_INVALID_CREDENTIALS");
    }

    return {
      token: signAdminToken(app, env.ADMIN_EMAIL)
    };
  });
}
