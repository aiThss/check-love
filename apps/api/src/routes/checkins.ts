import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Types } from "mongoose";
import { CheckIn } from "../models";
import { AppError } from "../lib/errors";
import { saveImageFile } from "../lib/uploads";
import { calculateCoupleStreak } from "../lib/streak";
import { notifyPartnerCheckIn } from "../lib/notifications";

const checkInSchema = z.object({
  type: z.enum(["photo", "text", "mood"]).default("text"),
  caption: z.string().trim().max(280).optional(),
  mood: z.string().trim().max(40).optional(),
  quickMessage: z.string().trim().max(120).optional()
});

const reactionSchema = z.object({
  type: z.enum(["heart", "hug", "kiss", "laugh", "miss"])
});

function requireUser(request: Parameters<FastifyInstance["authenticate"]>[0]) {
  if (!request.currentUser || !request.coupleId) {
    throw new AppError(401, "Please sign in again", "UNAUTHORIZED");
  }
  return request.currentUser;
}

function serializeCheckIn(checkIn: any) {
  return {
    id: String(checkIn._id ?? checkIn.id),
    coupleId: String(checkIn.coupleId),
    ownerId: String(checkIn.ownerId),
    ownerName: checkIn.ownerName,
    type: checkIn.type,
    imageUrl: checkIn.imageUrl,
    caption: checkIn.caption,
    mood: checkIn.mood,
    quickMessage: checkIn.quickMessage,
    reactions: (checkIn.reactions ?? []).map((reaction: any) => ({
      userId: String(reaction.userId),
      type: reaction.type,
      createdAt: reaction.createdAt
    })),
    createdAt: checkIn.createdAt,
    updatedAt: checkIn.updatedAt
  };
}

async function parseCheckInRequest(request: any, userId: string) {
  if (!request.isMultipart()) {
    return { data: checkInSchema.parse(request.body), uploaded: undefined };
  }

  const fields: Record<string, string> = {};
  let uploaded: Awaited<ReturnType<typeof saveImageFile>> | undefined;
  const parts = request.parts({
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1
    }
  });

  for await (const part of parts) {
    if (part.type === "file") {
      if (part.fieldname !== "image" || part.filename === "") {
        part.file.resume();
        continue;
      }
      uploaded = await saveImageFile(part, `checkins-${userId}`);
    } else {
      fields[part.fieldname] = String(part.value ?? "");
    }
  }

  return { data: checkInSchema.parse(fields), uploaded };
}

export async function checkInRoutes(app: FastifyInstance) {
  app.get("/checkins/latest", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const checkIn = await CheckIn.findOne({ coupleId: user.coupleId, deletedAt: { $exists: false } }).sort({
      createdAt: -1
    });
    return { checkIn: checkIn ? serializeCheckIn(checkIn) : null, streak: await calculateCoupleStreak(user.coupleId) };
  });

  app.get("/checkins/latest-partner", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const checkIn = await CheckIn.findOne({
      coupleId: user.coupleId,
      ownerId: { $ne: user._id },
      deletedAt: { $exists: false }
    }).sort({ createdAt: -1 });
    return { checkIn: checkIn ? serializeCheckIn(checkIn) : null, streak: await calculateCoupleStreak(user.coupleId) };
  });

  app.get("/checkins", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const rows = await CheckIn.find({ coupleId: user.coupleId, deletedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .limit(100);
    return { checkIns: rows.map(serializeCheckIn) };
  });

  app.post(
    "/checkins",
    { preHandler: app.authenticate, config: { rateLimit: { max: 30, timeWindow: "10 minutes" } } },
    async (request) => {
      const user = requireUser(request);
      const { data, uploaded } = await parseCheckInRequest(request, user.id);
      const hasContent = uploaded || data.caption || data.mood || data.quickMessage;

      if (!hasContent) {
        throw new AppError(400, "Add a photo, mood, caption, or quick message", "CHECKIN_EMPTY");
      }

      const checkIn = await CheckIn.create({
        coupleId: user.coupleId,
        ownerId: user._id,
        ownerName: user.displayName,
        type: uploaded ? "photo" : data.type,
        imageUrl: uploaded?.imageUrl,
        storagePath: uploaded?.storagePath,
        caption: data.caption,
        mood: data.mood,
        quickMessage: data.quickMessage
      });

      await notifyPartnerCheckIn(String(user.coupleId), user.id);
      return { checkIn: serializeCheckIn(checkIn), streak: await calculateCoupleStreak(user.coupleId) };
    }
  );

  app.post("/checkins/:id/reactions", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = reactionSchema.parse(request.body);

    const checkIn = await CheckIn.findOne({
      _id: params.id,
      coupleId: user.coupleId,
      deletedAt: { $exists: false }
    });
    if (!checkIn) throw new AppError(404, "Check-in not found", "CHECKIN_NOT_FOUND");

    checkIn.reactions = checkIn.reactions.filter(
      (reaction: { userId: Types.ObjectId }) => !reaction.userId.equals(user._id as Types.ObjectId)
    );
    checkIn.reactions.push({
      userId: user._id as Types.ObjectId,
      type: body.type,
      createdAt: new Date()
    });
    await checkIn.save();

    return { checkIn: serializeCheckIn(checkIn) };
  });

  app.delete("/checkins/:id", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const checkIn = await CheckIn.findOne({
      _id: params.id,
      coupleId: user.coupleId,
      ownerId: user._id,
      deletedAt: { $exists: false }
    });
    if (!checkIn) throw new AppError(404, "Check-in not found", "CHECKIN_NOT_FOUND");
    checkIn.deletedAt = new Date();
    await checkIn.save();
    return { ok: true };
  });
}
