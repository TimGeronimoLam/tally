// Generates placeholder PNG icons (solid background + tally marks) with no deps.
// Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [0x0f, 0x17, 0x2a]
const FG = [0x22, 0xc5, 0x5e]

function crc32(buf) {
  let c
  const table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y)
      const i = y * (size * 3 + 1) + 1 + x * 3
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Four vertical bars + one diagonal, drawn in a centered safe zone (maskable-friendly).
function tally(size) {
  const s = size / 64
  const bars = [18, 27, 36, 45].map((x) => x * s)
  const w = 5 * s
  const top = 18 * s
  const bottom = 46 * s
  return (x, y) => {
    for (const bx of bars) {
      if (Math.abs(x - bx) <= w / 2 && y >= top && y <= bottom) return FG
    }
    // diagonal from (12,42) to (52,22)
    const x0 = 12 * s,
      y0 = 42 * s,
      x1 = 52 * s,
      y1 = 22 * s
    const t =
      ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) /
      ((x1 - x0) ** 2 + (y1 - y0) ** 2)
    if (t >= 0 && t <= 1) {
      const px = x0 + t * (x1 - x0),
        py = y0 + t * (y1 - y0)
      if (Math.hypot(x - px, y - py) <= w / 2) return FG
    }
    return BG
  }
}

for (const [file, size] of [
  ['public/pwa-192x192.png', 192],
  ['public/pwa-512x512.png', 512],
  ['public/apple-touch-icon.png', 180],
]) {
  writeFileSync(file, png(size, tally(size)))
  console.log('wrote', file)
}
