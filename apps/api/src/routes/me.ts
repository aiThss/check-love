import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Couple } from "../models";
import { AppError } from "../lib/errors";
import { calculateCoupleStreak } from "../lib/streak";
import { saveImageFile } from "../lib/uploads";

const updateMeSchema = z.object({
  displayName: z.string().trim().min(1).max(64).optional(),
  partnerName: z.string().trim().min(1).max(64).optional(),
  loveStartDate: z.string().datetime().or(z.string().date()).optional()
});

function requireUser(request: Parameters<FastifyInstance["authenticate"]>[0]) {
  if (!request.currentUser || !request.coupleId) {
    throw new AppError(401, "Please sign in again", "UNAUTHORIZED");
  }
  return request.currentUser;
}

export async function meRoutes(app: FastifyInstance) {
  app.get("/me", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const couple = await Couple.findById(user.coupleId);
    const streak = await calculateCoupleStreak(user.coupleId);
    const daysTogether = couple
      ? Math.max(1, Math.floor((Date.now() - couple.loveStartDate.getTime()) / 86400000) + 1)
      : 1;

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
        partnerName: user.partnerName,
        email: user.email,
        emailVerified: user.emailVerified,
        avatarUrl: user.avatarUrl,
        partnerAvatarUrl: user.partnerAvatarUrl,
        status: user.status,
        coupleId: String(user.coupleId)
      },
      couple: couple
        ? {
            id: couple.id,
            code: couple.code,
            loveStartDate: couple.loveStartDate,
            memberIds: couple.memberIds.map(String)
          }
        : null,
      stats: {
        streak,
        daysTogether
      }
    };
  });

  app.patch("/me", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const body = updateMeSchema.parse(request.body);

    if (body.displayName) user.displayName = body.displayName;
    if (body.partnerName) user.partnerName = body.partnerName;
    await user.save();

    if (body.loveStartDate) {
      await Couple.findByIdAndUpdate(user.coupleId, { loveStartDate: new Date(body.loveStartDate) });
    }

    return { ok: true };
  });

  app.post("/me/avatar", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const file = await request.file({ limits: { fileSize: 10 * 1024 * 1024 } });
    if (!file) throw new AppError(400, "Image file is required", "FILE_REQUIRED");

    const uploaded = await saveImageFile(file, `avatars-${user.id}`);
    user.avatarUrl = uploaded.imageUrl;
    await user.save();
    return { avatarUrl: user.avatarUrl };
  });

  app.post("/me/partner-avatar", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const file = await request.file({ limits: { fileSize: 10 * 1024 * 1024 } });
    if (!file) throw new AppError(400, "Image file is required", "FILE_REQUIRED");

    const uploaded = await saveImageFile(file, `partner-avatars-${user.id}`);
    user.partnerAvatarUrl = uploaded.imageUrl;
    await user.save();
    return { partnerAvatarUrl: user.partnerAvatarUrl };
  });
}
