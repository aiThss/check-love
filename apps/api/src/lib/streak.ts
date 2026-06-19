import { Types } from "mongoose";
import { CheckIn } from "../models";

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, delta: number) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

export async function calculateCoupleStreak(coupleId: Types.ObjectId | string) {
  const rows = await CheckIn.find({ coupleId, deletedAt: { $exists: false } })
    .select("createdAt")
    .sort({ createdAt: -1 })
    .limit(120)
    .lean();

  if (!rows.length) return 0;

  const days = new Set(
    rows
      .map((row) => (row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map(ymd)
  );
  if (!days.size) return 0;

  const today = addDays(new Date(), 0);
  let cursor = today;

  if (!days.has(ymd(cursor))) {
    const yesterday = addDays(today, -1);
    if (!days.has(ymd(yesterday))) return 0;
    cursor = yesterday;
  }

  let streak = 0;
  while (days.has(ymd(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}
