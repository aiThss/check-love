import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const logoSvg = path.join(root, "assets", "brand", "lovecheck-logo.svg");
const resDir = path.join(root, "android", "app", "src", "main", "res");

const launcherSizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192
};

const foregroundSizes = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432
};

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function generateLauncherIcons() {
  for (const [folder, size] of Object.entries(launcherSizes)) {
    const dir = path.join(resDir, folder);
    await fs.mkdir(dir, { recursive: true });
    const icon = await sharp(logoSvg).resize(size, size).png().toBuffer();
    await fs.writeFile(path.join(dir, "ic_launcher.png"), icon);
    await fs.writeFile(path.join(dir, "ic_launcher_round.png"), icon);
  }

  for (const [folder, size] of Object.entries(foregroundSizes)) {
    const dir = path.join(resDir, folder);
    await fs.mkdir(dir, { recursive: true });
    await sharp(logoSvg)
      .resize(Math.round(size * 0.72), Math.round(size * 0.72))
      .extend({
        top: Math.round(size * 0.14),
        bottom: Math.round(size * 0.14),
        left: Math.round(size * 0.14),
        right: Math.round(size * 0.14),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(dir, "ic_launcher_foreground.png"));
  }
}

async function generateSplashImages() {
  const entries = await fs.readdir(resDir, { withFileTypes: true });
  const splashPaths = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("drawable"))
    .map((entry) => path.join(resDir, entry.name, "splash.png"));

  for (const splashPath of splashPaths) {
    if (!(await exists(splashPath))) continue;
    const meta = await sharp(splashPath).metadata();
    const width = meta.width ?? 480;
    const height = meta.height ?? 320;
    const logoSize = Math.round(Math.min(width, height) * 0.46);
    const logo = await sharp(logoSvg).resize(logoSize, logoSize).png().toBuffer();

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: "#ffffff"
      }
    })
      .composite([
        {
          input: logo,
          left: Math.round((width - logoSize) / 2),
          top: Math.round((height - logoSize) / 2)
        }
      ])
      .png()
      .toFile(splashPath);
  }
}

if (!(await exists(resDir))) {
  throw new Error("Android project not found. Run `npx cap add android` first.");
}

await generateLauncherIcons();
await generateSplashImages();
console.log("Generated LoveCheck Android launcher and splash assets.");
