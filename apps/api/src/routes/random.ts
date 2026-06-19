import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { RandomEvent } from "../models";
import { AppError } from "../lib/errors";
import { drawPrompt, randomCategories } from "../lib/randomPrompts";

function requireUser(request: Parameters<FastifyInstance["authenticate"]>[0]) {
  if (!request.currentUser || !request.coupleId) {
    throw new AppError(401, "Please sign in again", "UNAUTHORIZED");
  }
  return request.currentUser;
}

export async function randomRoutes(app: FastifyInstance) {
  app.get("/random/categories", { preHandler: app.authenticate }, async () => ({
    categories: randomCategories.map((category) => ({
      id: category.id,
      name: category.name,
      count: category.prompts.length
    }))
  }));

  app.get("/random/history", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const rows = await RandomEvent.find({ coupleId: user.coupleId }).sort({ createdAt: -1 }).limit(30);
    return {
      events: rows.map((event) => ({
        id: event.id,
        category: event.category,
        prompt: event.prompt,
        detail: event.detail,
        createdAt: event.createdAt,
        userId: String(event.userId)
      }))
    };
  });

  app.post("/random/draw", { preHandler: app.authenticate }, async (request) => {
    const user = requireUser(request);
    const body = z.object({ category: z.string().optional(), detail: z.string().max(160).optional() }).parse(request.body);
    const { category, prompt } = drawPrompt(body.category);
    const event = await RandomEvent.create({
      coupleId: user.coupleId,
      userId: user._id,
      category: category.name,
      prompt,
      detail: body.detail
    });

    return {
      event: {
        id: event.id,
        category: event.category,
        prompt: event.prompt,
        detail: event.detail,
        createdAt: event.createdAt
      }
    };
  });
}
