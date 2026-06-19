import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { randomUUID } from "node:crypto";
import type { MultipartFile } from "@fastify/multipart";
import { env } from "../config/env";
import { AppError } from "./errors";

const allowedImageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"]
]);

export async function ensureUploadDir() {
  await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
}

export async function saveImageFile(file: MultipartFile, folder: string) {
  const extension = allowedImageTypes.get(file.mimetype);
  if (!extension) {
    throw new AppError(400, "Only image uploads are allowed", "INVALID_IMAGE_TYPE");
  }

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "misc";
  const targetDir = path.join(env.UPLOAD_DIR, safeFolder);
  await fs.mkdir(targetDir, { recursive: true });

  const filename = `${randomUUID()}${extension}`;
  const storagePath = path.join(targetDir, filename);

  try {
    await pipeline(file.file, await fs.open(storagePath, "w").then((handle) => handle.createWriteStream()));
  } catch (error) {
    await fs.rm(storagePath, { force: true });
    throw error;
  }

  const publicPath = `/uploads/${safeFolder}/${filename}`;
  return {
    storagePath,
    imageUrl: `${env.PUBLIC_API_BASE_URL}${publicPath}`
  };
}
