// Original MathTech Intel geometric monogram and wordmarks; no upstream brand shapes.
// Wordmark outlines use the bundled Noto Sans SC font under assets/og-fonts/LICENSE.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";
const root = path.resolve(import.meta.dirname, "../..");
const out = import.meta.dirname;
const logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="72" fill="#102d3d"/><path d="M76 364V152h34l66 95 66-95h34v212h-44V230l-56 82-56-82v134Z" fill="#f2f6fa"/><path d="M298 152h144v44h-50v168h-44V196h-50Z" fill="#51d7bb"/></svg>';
writeFileSync(path.join(out, "logo.svg"), logo + "\n");
for (const [name, size] of [["icon.png", 512], ["icon-192.png", 192], ["apple-icon.png", 180]] as const) await sharp(Buffer.from(logo)).resize(size, size).png().toFile(path.join(out, name));
const png = await sharp(Buffer.from(logo)).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4); header[6] = 32; header[7] = 32; header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
writeFileSync(path.join(out, "favicon.ico"), Buffer.concat([header, png]));
const bytes = readFileSync(path.join(root, "assets/og-fonts/noto-sans-sc-700.ttf"));
const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const boxes: Record<string, string> = {};
for (const [name, tail] of Object.entries({ daily: "日报", weekly: "周报", monthly: "月报", archive: "合订本" })) {
  const a = font.getPath("MathTech Intel", 0, 100, 100);
  const x = a.getBoundingBox().x2 + 32;
  const b = font.getPath(tail, x, 100, 100);
  const viewBox = `0 0 ${Math.ceil(b.getBoundingBox().x2 + 10)} 130`;
  boxes[name] = viewBox;
  writeFileSync(path.join(out, `nameplates/${name}.svg`), `<!-- Original MathTech Intel wordmark; Noto Sans SC, SIL OFL 1.1. -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path id="accent" d="${a.toPathData(1)}"/><path id="ink" d="${b.toPathData(1)}"/></svg>\n`);
}
writeFileSync(path.join(out, "nameplates/index.json"), JSON.stringify(boxes, null, 2) + "\n");
