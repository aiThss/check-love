import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { CheckIn, Couple, PushSubscription, RandomEvent, User } from "../models";
import { AppError } from "../lib/errors";

export async function adminRoutes(app: FastifyInstance) {
  app.get("/admin/summary", { preHandler: app.requireAdmin }, async () => {
    const [users, couples, checkIns, blockedUsers, randomEvents, pushSubscriptions] = await Promise.all([
      User.countDocuments(),
      Couple.countDocuments(),
      CheckIn.countDocuments({ deletedAt: { $exists: false } }),
      User.countDocuments({ status: "blocked" }),
      RandomEvent.countDocuments(),
      PushSubscription.countDocuments()
    ]);

    return { users, couples, checkIns, blockedUsers, randomEvents, pushSubscriptions };
  });

  app.get("/admin/users", { preHandler: app.requireAdmin }, async () => {
    const users = await User.find().sort({ createdAt: -1 }).limit(200).lean();
    return {
      users: users.map((user) => ({
        id: String(user._id),
        displayName: user.displayName,
        partnerName: user.partnerName,
        email: user.email,
        status: user.status,
        coupleId: String(user.coupleId),
        createdAt: user.createdAt
      }))
    };
  });

  app.patch("/admin/users/:id", { preHandler: app.requireAdmin }, async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z
      .object({
        status: z.enum(["active", "blocked"]).optional(),
        displayName: z.string().trim().min(1).max(64).optional(),
        partnerName: z.string().trim().min(1).max(64).optional()
      })
      .parse(request.body);

    const user = await User.findByIdAndUpdate(params.id, body, { new: true });
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    return { ok: true };
  });

  app.get("/admin/couples", { preHandler: app.requireAdmin }, async () => {
    const couples = await Couple.find().sort({ createdAt: -1 }).limit(200).lean();
    return {
      couples: couples.map((couple) => ({
        id: String(couple._id),
        code: couple.code,
        loveStartDate: couple.loveStartDate,
        memberIds: couple.memberIds.map(String),
        createdAt: couple.createdAt
      }))
    };
  });

  app.patch("/admin/couples/:id", { preHandler: app.requireAdmin }, async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const body = z.object({ loveStartDate: z.string().datetime().or(z.string().date()) }).parse(request.body);
    const couple = await Couple.findByIdAndUpdate(params.id, { loveStartDate: new Date(body.loveStartDate) });
    if (!couple) throw new AppError(404, "Couple not found", "COUPLE_NOT_FOUND");
    return { ok: true };
  });

  app.get("/admin/checkins", { preHandler: app.requireAdmin }, async () => {
    const checkIns = await CheckIn.find().sort({ createdAt: -1 }).limit(200).lean();
    return {
      checkIns: checkIns.map((item) => ({
        id: String(item._id),
        coupleId: String(item.coupleId),
        ownerId: String(item.ownerId),
        ownerName: item.ownerName,
        type: item.type,
        imageUrl: item.imageUrl,
        caption: item.caption,
        mood: item.mood,
        quickMessage: item.quickMessage,
        deletedAt: item.deletedAt,
        createdAt: item.createdAt
      }))
    };
  });

  app.delete("/admin/checkins/:id", { preHandler: app.requireAdmin }, async (request) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const checkIn = await CheckIn.findById(params.id);
    if (!checkIn) throw new AppError(404, "Check-in not found", "CHECKIN_NOT_FOUND");
    checkIn.deletedAt = new Date();
    await checkIn.save();
    return { ok: true };
  });

  app.get("/admin/random-events", { preHandler: app.requireAdmin }, async () => {
    const events = await RandomEvent.find().sort({ createdAt: -1 }).limit(200).lean();
    return {
      events: events.map((event) => ({
        id: String(event._id),
        coupleId: String(event.coupleId),
        userId: String(event.userId),
        category: event.category,
        prompt: event.prompt,
        detail: event.detail,
        createdAt: event.createdAt
      }))
    };
  });
}
