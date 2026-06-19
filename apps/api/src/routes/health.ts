import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({
    ok: true,
    name: "lovecheck-api",
    time: new Date().toISOString()
  }));
}
