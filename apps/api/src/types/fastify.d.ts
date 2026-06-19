import type { FastifyReply, FastifyRequest } from "fastify";
import type { HydratedDocument } from "mongoose";
import type { IUser } from "../models";

export interface TokenPayload {
  role: "user" | "admin";
  userId?: string;
  coupleId?: string;
  email?: string;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }

  interface FastifyRequest {
    currentUser?: HydratedDocument<IUser>;
    currentPayload?: TokenPayload;
    coupleId?: string;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}
