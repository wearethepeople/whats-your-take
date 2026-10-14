// Renders public/og.png — the social share image — from the same path data
// the site uses for the WrTP stripes and the stacked wordmark, so the share
// card is the poster lockup and never drifts from the components.
//
//   node other/og-image.mjs
//
// Re-run after changing wordmark.tsx or wrtp-icon.tsx and commit the PNG.
// The tagline is set in Public Sans from the @fontsource package (the same
// files the site serves); FONTCONFIG_FILE below points librsvg at them.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

// Pull every `<path d="…">` out of a component, in document order, plus the
// first viewBox. Both components are plain SVG markup, nothing dynamic.
function marks(source) {
  const [, viewBox] = source.match(/viewBox="([^"]+)"/);
  const [, , w, h] = viewBox.split(" ").map(Number);
  const ds = [...source.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
  return { w, h, paths: ds.map((d) => `<path d="${d}"/>`).join("") };
}

const stripes = marks(read("app/components/wrtp-icon.tsx"));
const wordmarkSource = read("app/components/wordmark.tsx");
// The stacked mark is the second <svg> in the file.
const stacked = marks(wordmarkSource.slice(wordmarkSource.indexOf("WordmarkStacked")));

const W = 1200;
const H = 630;
const markH = 300; // wordmark height; everything else derives from it (see WytLockup)
const gap = markH * 0.09;
const taglineGap = markH * 0.06;
const taglineSize = markH * 0.085;

const stripesW = (markH * stripes.w) / stripes.h;
const stackedW = (markH * stacked.w) / stacked.h;
const lockupW = stripesW + gap + stackedW;
const lockupH = markH + taglineGap + taglineSize;
const x0 = (W - lockupW) / 2;
const y0 = (H - lockupH) / 2;
const wordmarkX = x0 + stripesW + gap;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#fdf6ec"/>
  <g transform="translate(${x0} ${y0}) scale(${markH / stripes.h})" fill="#f1673b">${stripes.paths}</g>
  <g transform="translate(${wordmarkX} ${y0}) scale(${markH / stacked.h})" fill="#231f20">${stacked.paths}</g>
  <text x="${wordmarkX}" y="${y0 + markH + taglineGap + taglineSize * 0.95}" font-family="Public Sans" font-size="${taglineSize}" fill="#8a5a34">A civic mirror project.</text>
</svg>`;

// Point fontconfig at the bundled Public Sans so the tagline matches the site.
const fontsConf = resolve(root, "node_modules/.cache/og-fonts.conf");
mkdirSync(dirname(fontsConf), { recursive: true });
writeFileSync(
  fontsConf,
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig>
  <dir>${resolve(root, "node_modules/@fontsource/public-sans/files")}</dir>
  <cachedir>${resolve(root, "node_modules/.cache/fontconfig")}</cachedir>
</fontconfig>`,
);
process.env.FONTCONFIG_FILE = fontsConf;

const out = resolve(root, "public/og.png");
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(`wrote ${out} (${W}x${H})`);
