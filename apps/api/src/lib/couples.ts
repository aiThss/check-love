import { Types } from "mongoose";
import { Couple } from "../models";
import { AppError } from "./errors";

export function normalizeCoupleCode(code: string) {
  return code.trim().replace(/\s+/g, "").toUpperCase();
}

export async function findOrCreateCouple(code: string, loveStartDate?: string) {
  const normalizedCode = normalizeCoupleCode(code);
  if (normalizedCode.length < 3) {
    throw new AppError(400, "Couple code must have at least 3 characters", "INVALID_COUPLE_CODE");
  }

  const existing = await Couple.findOne({ code: normalizedCode });
  if (existing) return existing;

  return Couple.create({
    code: normalizedCode,
    loveStartDate: loveStartDate ? new Date(loveStartDate) : new Date(),
    memberIds: []
  });
}

export async function attachUserToCouple(coupleId: Types.ObjectId, userId: Types.ObjectId) {
  const couple = await Couple.findById(coupleId);
  if (!couple) throw new AppError(404, "Couple not found", "COUPLE_NOT_FOUND");

  const alreadyMember = couple.memberIds.some((id: Types.ObjectId) => id.equals(userId));
  if (alreadyMember) return couple;

  if (couple.memberIds.length >= 2) {
    throw new AppError(409, "This couple already has two members", "COUPLE_FULL");
  }

  couple.memberIds.push(userId);
  await couple.save();
  return couple;
}
