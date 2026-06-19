import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { PushSubscription } from "../models";
import { AppError } from "../lib/errors";
import { env } from "../config/env";

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
});

function requireUser(request: Parameters<FastifyInstance["authenticate"]>[0]) {
  if (!request.currentUser || !request.coupleId) {
    throw new AppError(401, "Please sign in again", "UNAUTHORIZED");
  }
  return request.currentUser;
}

export async function pushRoutes(app: FastifyInstance) {
  app.get("/push/public-key", async () => ({
    publicKey: env.VAPID_PUBLIC_KEY ?? null
  }));

  app.post("/push/subscribe", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const body = subscriptionSchema.parse(request.body);
    await PushSubscription.findOneAndUpdate(
      { endpoint: body.endpoint },
      {
        userId: user._id,
        coupleId: user.coupleId,
        endpoint: body.endpoint,
        keys: body.keys,
        userAgent: request.headers["user-agent"]
      },
      { upsert: true, new: true }
    );
    return { ok: true };
  });

  app.post("/push/unsubscribe", { preHandler: app.authenticate }, async (request) => {
    const body = z.object({ endpoint: z.string().url() }).parse(request.body);
    await PushSubscription.deleteOne({ endpoint: body.endpoint });
    return { ok: true };
  });
}
