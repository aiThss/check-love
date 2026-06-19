import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const root = process.cwd();
const logoSvg = path.join(root, "assets", "brand", "lovecheck-logo.svg");
const targets = [
  path.join(root, "apps", "web", "public"),
  path.join(root, "apps", "admin", "public")
];
const iconSizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeIcons(publicDir) {
  await ensureDir(publicDir);
  await fs.copyFile(logoSvg, path.join(publicDir, "logo.svg"));

  for (const size of iconSizes) {
    await sharp(logoSvg)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `icon-${size}.png`));
  }

  const icoPngs = await Promise.all(
    [16, 32, 48].map(async (size) => {
      const buffer = await sharp(logoSvg).resize(size, size).png().toBuffer();
      return buffer;
    })
  );
  const ico = await pngToIco(icoPngs);
  await fs.writeFile(path.join(publicDir, "favicon.ico"), ico);
}

await Promise.all(targets.map(writeIcons));
console.log("Generated LoveCheck icons for web and admin.");
