// THE WORLD — newspaper front page for Thursday 19 November 2026.
// Node 22 stdlib-only program. Writes ONE 1024x1024 PNG to
// $MAKEFUN_OUTPUT_DIR/entry.png (default /output/entry.png).
// Deterministic: fixed seed, no Date.now, no Math.random, no network.
// Own PNG encoder (CRC32 + zlib level 9) and own 5x7 bitmap font.
//
// Run locally:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ------------------------------------------------------------------ RNG
// mulberry32 with a fixed seed — the only source of variation, and it is
// fully deterministic.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function (): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261119);

// ------------------------------------------------------------------ CRC32
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// ------------------------------------------------------------------ PNG
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width: number, height: number, rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const rowBytes = 1 + width * 3;
  const raw = Buffer.alloc(height * rowBytes);
  for (let y = 0; y < height; y++) {
    raw[y * rowBytes] = 0; // filter: none
    Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(
      raw,
      y * rowBytes + 1,
    );
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ 5x7 font
// Each glyph: 7 rows, each row a 5-bit value (bit 4 = leftmost pixel).
// Drawn from scratch for this page.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  a: [0x00, 0x00, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  b: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x1e],
  c: [0x00, 0x00, 0x0e, 0x10, 0x10, 0x11, 0x0e],
  d: [0x01, 0x01, 0x0f, 0x11, 0x11, 0x11, 0x0f],
  e: [0x00, 0x00, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  f: [0x06, 0x09, 0x08, 0x1e, 0x08, 0x08, 0x08],
  g: [0x00, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  h: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x11],
  i: [0x04, 0x00, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  j: [0x02, 0x00, 0x06, 0x02, 0x02, 0x12, 0x0c],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x12],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  m: [0x00, 0x00, 0x1a, 0x15, 0x15, 0x15, 0x15],
  n: [0x00, 0x00, 0x1e, 0x11, 0x11, 0x11, 0x11],
  o: [0x00, 0x00, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  p: [0x00, 0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10],
  q: [0x00, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x01],
  r: [0x00, 0x00, 0x16, 0x19, 0x10, 0x10, 0x10],
  s: [0x00, 0x00, 0x0f, 0x10, 0x0e, 0x01, 0x1e],
  t: [0x08, 0x08, 0x1c, 0x08, 0x08, 0x08, 0x06],
  u: [0x00, 0x00, 0x11, 0x11, 0x11, 0x13, 0x0d],
  v: [0x00, 0x00, 0x11, 0x11, 0x11, 0x0a, 0x04],
  w: [0x00, 0x00, 0x11, 0x15, 0x15, 0x15, 0x0a],
  x: [0x00, 0x00, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  y: [0x00, 0x11, 0x11, 0x0f, 0x01, 0x01, 0x0e],
  z: [0x00, 0x00, 0x1f, 0x02, 0x04, 0x08, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x0e, 0x10, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x01, 0x0e],
  " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x0c],
  ",": [0x00, 0x00, 0x00, 0x00, 0x0c, 0x04, 0x08],
  "-": [0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00],
  ":": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x0c, 0x00],
  ";": [0x00, 0x0c, 0x0c, 0x00, 0x0c, 0x04, 0x08],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "'": [0x04, 0x04, 0x08, 0x00, 0x00, 0x00, 0x00],
  '"': [0x0a, 0x0a, 0x0a, 0x00, 0x00, 0x00, 0x00],
  "+": [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  "=": [0x00, 0x00, 0x1f, 0x00, 0x1f, 0x00, 0x00],
  _: [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f],
  "*": [0x00, 0x15, 0x0e, 0x1f, 0x0e, 0x15, 0x00],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "[": [0x0e, 0x08, 0x08, 0x08, 0x08, 0x08, 0x0e],
  "]": [0x0e, 0x02, 0x02, 0x02, 0x02, 0x02, 0x0e],
  "\\": [0x10, 0x08, 0x08, 0x04, 0x02, 0x02, 0x01],
  "^": [0x04, 0x0a, 0x11, 0x00, 0x00, 0x00, 0x00],
  "`": [0x08, 0x04, 0x02, 0x00, 0x00, 0x00, 0x00],
  "{": [0x06, 0x08, 0x08, 0x1c, 0x08, 0x08, 0x06],
  "}": [0x0c, 0x02, 0x02, 0x07, 0x02, 0x02, 0x0c],
  "|": [0x04, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  "~": [0x00, 0x00, 0x09, 0x16, 0x00, 0x00, 0x00],
};

// ------------------------------------------------------------------ canvas
const W = 1024;
const H = 1024;
const PIX = new Uint8Array(W * H * 3);

type RGB = [number, number, number];
const PAPER: RGB = [247, 242, 231];
const INK: RGB = [17, 17, 17];
const RED: RGB = [139, 26, 26];
const GRAY: RGB = [96, 96, 96];
const SKY_TOP: RGB = [168, 200, 224];
const SKY_BOT: RGB = [234, 242, 247];
const SUN: RGB = [242, 208, 107];
const SUN_HALO: RGB = [250, 228, 160];
const GROUND: RGB = [40, 46, 52];
const POLE: RGB = [60, 60, 60];
const WIN_LIT: RGB = [255, 217, 138];
const WIN_DARK: RGB = [28, 39, 51];
const BUILDINGS: RGB[] = [
  [46, 58, 70],
  [62, 76, 92],
  [38, 50, 62],
  [74, 88, 104],
  [52, 66, 80],
];

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  PIX[i] = c[0];
  PIX[i + 1] = c[1];
  PIX[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      PIX[i] = c[0];
      PIX[i + 1] = c[1];
      PIX[i + 2] = c[2];
      i += 3;
    }
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) setPixel(x, y, c);
    }
  }
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// ------------------------------------------------------------------ text
function drawChar(ch: string, x: number, y: number, scale: number, color: RGB): void {
  const g = FONT[ch] || FONT["?"];
  for (let r = 0; r < 7; r++) {
    const bits = g[r];
    for (let col = 0; col < 5; col++) {
      if ((bits >> (4 - col)) & 1) {
        fillRect(x + col * scale, y + r * scale, scale, scale, color);
      }
    }
  }
}

function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * 6 * scale - scale;
}

function drawText(text: string, x: number, y: number, scale: number, color: RGB): number {
  let cx = x;
  for (const ch of text) {
    drawChar(ch, cx, y, scale, color);
    cx += 6 * scale;
  }
  return cx - x - scale;
}

function drawTextCentered(text: string, cx: number, y: number, scale: number, color: RGB): void {
  drawText(text, Math.round(cx - textWidth(text, scale) / 2), y, scale, color);
}

function wrapText(text: string, maxWidth: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur === "" ? w : cur + " " + w;
    if (textWidth(test, scale) <= maxWidth) {
      cur = test;
    } else {
      if (cur !== "") lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// Draws wrapped text, returns the y just below the last line.
function drawWrapped(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  scale: number,
  color: RGB,
  lineGap: number,
): number {
  const lines = wrapText(text, maxWidth, scale);
  let yy = y;
  for (const line of lines) {
    drawText(line, x, yy, scale, color);
    yy += 7 * scale + lineGap;
  }
  return yy;
}

// ------------------------------------------------------------------ flags
// Small 46x30 flags on poles, drawn in front of the skyline.
function drawFlagUSA(fx: number, fy: number): void {
  const fw = 46;
  const fh = 30;
  fillRect(fx, fy, fw, fh, [255, 255, 255]);
  for (let i = 0; i < 7; i++) {
    fillRect(fx, fy + i * 4, fw, 2, [178, 34, 52]);
  }
  fillRect(fx, fy, 19, 15, [60, 59, 110]);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      fillRect(fx + 3 + c * 4, fy + 3 + r * 4, 2, 2, [255, 255, 255]);
    }
  }
}

function drawFlagCHN(fx: number, fy: number): void {
  const fw = 46;
  const fh = 30;
  fillRect(fx, fy, fw, fh, [222, 41, 16]);
  fillCircle(fx + 11, fy + 9, 5, [255, 222, 0]);
  fillRect(fx + 24, fy + 4, 3, 3, [255, 222, 0]);
  fillRect(fx + 30, fy + 9, 3, 3, [255, 222, 0]);
  fillRect(fx + 24, fy + 15, 3, 3, [255, 222, 0]);
  fillRect(fx + 30, fy + 19, 3, 3, [255, 222, 0]);
}

function drawFlagRUS(fx: number, fy: number): void {
  const fw = 46;
  const fh = 30;
  fillRect(fx, fy, fw, 10, [255, 255, 255]);
  fillRect(fx, fy + 10, fw, 10, [0, 57, 166]);
  fillRect(fx, fy + 20, fw, 10, [213, 0, 50]);
}

// ------------------------------------------------------------------ skyline
function drawSkyline(x0: number, y0: number, x1: number, y1: number): void {
  // Sky gradient.
  const steps = 24;
  for (let s = 0; s < steps; s++) {
    const t = s / (steps - 1);
    const yy = y0 + Math.floor(((y1 - y0) * s) / steps);
    const hh = Math.ceil((y1 - y0) / steps) + 1;
    fillRect(x0, yy, x1 - x0, hh, mix(SKY_TOP, SKY_BOT, t));
  }
  // A few faint stars in the upper sky.
  for (let i = 0; i < 26; i++) {
    const sx = x0 + 8 + Math.floor(rng() * (x1 - x0 - 16));
    const sy = y0 + 4 + Math.floor(rng() * 34);
    fillRect(sx, sy, 2, 2, [255, 255, 255]);
  }
  // Sun with a soft halo, upper right, clear of the flag poles.
  fillCircle(940, y0 + 30, 28, SUN_HALO);
  fillCircle(940, y0 + 30, 20, SUN);
  // Buildings, back to front.
  let bx = x0 + 4;
  const base = y1 - 12;
  while (bx < x1 - 30) {
    const bw = 34 + Math.floor(rng() * 40);
    const bh = 40 + Math.floor(rng() * 44);
    const col = BUILDINGS[Math.floor(rng() * BUILDINGS.length)];
    const by = base - bh;
    fillRect(bx, by, bw, bh, col);
    // Windows: small lit grid.
    const cols = Math.floor((bw - 8) / 9);
    const rows = Math.floor((bh - 10) / 11);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = rng() < 0.34;
        fillRect(
          bx + 5 + c * 9,
          by + 6 + r * 11,
          4,
          6,
          lit ? WIN_LIT : WIN_DARK,
        );
      }
    }
    // One tall tower with a spire near the middle of the scene.
    // The spire is capped so it never pokes above the skyline top.
    if (bx > 380 && bx < 460) {
      const sp = Math.max(0, Math.min(18, by - y0 - 10));
      if (sp > 4) {
        fillRect(bx + Math.floor(bw / 2) - 2, by - sp, 4, sp, col);
        fillRect(bx + Math.floor(bw / 2) - 1, by - sp - 4, 2, 4, [200, 60, 60]);
      }
    }
    bx += bw + 3 + Math.floor(rng() * 8);
  }
  // Ground band.
  fillRect(x0, base, x1 - x0, 12, GROUND);
  // Three flag poles with national flags, right side.
  const poles: Array<{ x: number; label: string; draw: (fx: number, fy: number) => void }> = [
    { x: 680, label: "USA", draw: drawFlagUSA },
    { x: 780, label: "CHN", draw: drawFlagCHN },
    { x: 880, label: "RUS", draw: drawFlagRUS },
  ];
  for (const p of poles) {
    fillRect(p.x - 1, y0 + 52, 3, base - (y0 + 52), POLE);
    p.draw(p.x - 23, y0 + 22);
    // Paper name tag under each flag so the label stays legible
    // against the dark buildings behind it.
    fillRect(p.x - 24, y0 + 56, 48, 18, PAPER);
    fillRect(p.x - 24, y0 + 56, 48, 1, INK);
    fillRect(p.x - 24, y0 + 73, 48, 1, INK);
    drawTextCentered(p.label, p.x, y0 + 58, 2, INK);
  }
}

// ------------------------------------------------------------------ page
const MX = 36; // side margin
const CW = W - MX * 2; // content width = 952

// Paper background.
fillRect(0, 0, W, H, PAPER);

// Thin frame around the page.
fillRect(12, 12, W - 24, 3, INK);
fillRect(12, H - 15, W - 24, 3, INK);
fillRect(12, 12, 3, H - 24, INK);
fillRect(W - 15, 12, 3, H - 24, INK);

// Masthead.
drawTextCentered("THE WORLD", W / 2, 30, 14, INK);
// Double rule under the masthead.
fillRect(MX, 140, CW, 3, INK);
fillRect(MX, 146, CW, 1, INK);
// Dateline row.
drawText("Thursday 19 November 2026", MX, 158, 2, INK);
const ed = "GLOBAL EDITION";
drawText(ed, W - MX - textWidth(ed, 2), 158, 2, INK);

// ---- Lead story ----
const leadHead = "TRUMP, XI AND PUTIN SHAKE HANDS AS LEADERS GATHER IN CHINA";
let ly = 184;
ly = drawWrapped(leadHead, MX, ly, CW, 3, INK, 6);
ly += 8;
ly = drawWrapped(
  "The three leaders meet for a trilateral at APEC in Shenzhen, in a rare joint appearance on the world stage.",
  MX,
  ly,
  CW,
  2,
  INK,
  4,
);
ly += 6;
// Skyline scene.
const skyY0 = ly;
const skyY1 = skyY0 + 104;
drawSkyline(MX, skyY0, MX + CW, skyY1);
// Rule under the lead.
fillRect(MX, skyY1 + 10, CW, 2, INK);

// ---- Four more stories, 2 x 2 grid ----
type Story = { head: string; body: string };
const stories: Story[] = [
  {
    head: "CRIMEAN BRIDGE ATTACKED AGAIN",
    body: "A Russian official confirms a fresh attack on the Kerch bridge linking Russia to Crimea.",
  },
  {
    head: "ANTHROPIC RAISES $81.3BN IN BIGGEST IPO OF ALL TIME",
    body: "The Claude-maker's stock market debut is the largest initial public offering in history.",
  },
  {
    head: "MYANMAR FACES HISTORIC GENOCIDE VERDICT",
    body: "The UN court in The Hague rules on the Rohingya massacres in a landmark case.",
  },
  {
    head: "GAZA: RARE GROUND OPERATION BEYOND YELLOW LINE",
    body: "Israel launches a ground operation as Australia, Canada, Italy and the UK jointly call for aid to reach flooded Gaza.",
  },
];
const gridX = [MX, MX + 468 + 16];
const gridY = [skyY1 + 14, skyY1 + 14 + 158 + 8];
const cellW = 468;
for (let i = 0; i < stories.length; i++) {
  const cx = gridX[i % 2];
  const cy = gridY[Math.floor(i / 2)];
  fillRect(cx, cy, cellW, 3, RED);
  let yy = cy + 12;
  yy = drawWrapped(stories[i].head, cx, yy, cellW, 2, INK, 4);
  yy += 6;
  drawWrapped(stories[i].body, cx, yy, cellW, 2, [40, 40, 40], 4);
}

// ---- ALSO TODAY strip ----
const stripY = gridY[1] + 158 + 12;
fillRect(MX, stripY, CW, 2, INK);
drawText("ALSO TODAY", MX, stripY + 10, 3, RED);
const itemsLeft: string[] = [
  "GTA VI begins global rollout; gamers enter Vice City",
  "NASA Voyager 1 reaches one light-day milestone",
  "Democrats nominate Hakeem Jeffries for House Speaker, who would be the first African-American Speaker",
  "Van Gogh painting sells for record $190.4m",
];
const itemsRight: string[] = [
  "Estonia plans to close border with Russia",
  "North Korea fires missiles after US-South Korea drill",
  "Cyclone Akvan intensifies toward Andhra Pradesh, Odisha",
];
function drawItems(items: string[], x: number, y: number): number {
  let yy = y;
  for (const it of items) {
    fillRect(x, yy + 5, 6, 6, RED);
    yy = drawWrapped(it, x + 14, yy, cellW - 14, 2, INK, 4);
    yy += 6;
  }
  return yy;
}
const itemsY = stripY + 40;
const endLeft = drawItems(itemsLeft, MX, itemsY);
drawItems(itemsRight, MX + 468 + 16, itemsY);

// ---- Footer ----
const footRuleY = Math.max(endLeft, itemsY + 120) + 4;
fillRect(MX, footRuleY, CW, 2, INK);
drawTextCentered(
  "Sources: Reuters, AP, AFP, BBC, NYT, Al Jazeera",
  W / 2,
  footRuleY + 10,
  2,
  GRAY,
);

// ------------------------------------------------------------------ write
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "entry.png"), encodePNG(W, H, PIX));
