#!/usr/bin/env node
/**
 * Generate PWA PNG icons from public/icon.svg.
 *
 * Usage:
 *   pnpm dlx sharp-cli@latest -- /dev/null   # one-time install of sharp
 *   node scripts/generate-pwa-icons.mjs
 *
 * Outputs:
 *   public/icon-192.png         — Android home-screen
 *   public/icon-512.png         — Android splash + PWA install
 *   public/apple-touch-icon.png — iOS Safari "Add to Home Screen"
 *
 * We don't run this in CI — icons are committed to the repo so the
 * production image doesn't depend on sharp at build time.
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE = join(ROOT, "public", "icon.svg");

const TARGETS = [
  { size: 192, file: "icon-192.png" },
  { size: 512, file: "icon-512.png" },
  { size: 180, file: "apple-touch-icon.png" },
];

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.error(
    "✗ `sharp` is not installed. Run: pnpm add -D sharp\n  (or use 'pnpm dlx sharp-cli' for a one-shot conversion)",
  );
  process.exit(1);
}

const svg = await readFile(SOURCE);

for (const { size, file } of TARGETS) {
  const out = join(ROOT, "public", file);
  await sharp(svg, { density: 300 })
    .resize(size, size, { fit: "contain", background: { r: 248, g: 250, b: 252, alpha: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`✓ ${file} (${size}×${size})`);
}

console.log("\nDone. Commit the generated PNGs alongside icon.svg.");
