// Renders the Tally mark from the design canvas (Logo artboard) into the
// PWA icon set. No dependencies: strokes are drawn as anti-aliased capsules.
// Run: node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

/* ---------- the mark, in the artboard's 64×64 space ---------- */
const BARS = [13, 25, 37, 49].map((x) => [
  [x, 12],
  [x, 52],
])
const DIAG = [
  [7, 50],
  [55, 14],
]

const ACCENT = [0x0f, 0x8a, 0x5f]
const WHITE = [0xff, 0xff, 0xff]

/* ---------- tiny raster helpers ---------- */
const clamp01 = (v) => Math.max(0, Math.min(1, v))

function segmentDistance(px, py, [ax, ay], [bx, by]) {
  const abx = bx - ax
  const aby = by - ay
  const t = clamp01(
    ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby),
  )
  return Math.hypot(px - (ax + t * abx), py - (ay + t * aby))
}

function roundedRectDistance(px, py, size, radius) {
  const half = size / 2
  const qx = Math.abs(px - half) - (half - radius)
  const qy = Math.abs(py - half) - (half - radius)
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  return outside + Math.min(Math.max(qx, qy), 0) - radius
}

/**
 * @param {number} size      output pixels
 * @param {object} opts
 * @param {number[]} opts.bg          background colour
 * @param {number} opts.radius        corner radius in px (0 = square)
 * @param {number} opts.iconScale     mark size as a fraction of the tile
 * @param {number} opts.strokeWidth   in 64-space units
 * @param {number[]} opts.bars        bar colour
 * @param {number[]} opts.diag        diagonal colour
 */
function renderTile(size, { bg, radius, iconScale, strokeWidth, bars, diag }) {
  const iconPx = size * iconScale
  const offset = (size - iconPx) / 2
  const unit = iconPx / 64
  const r = (strokeWidth / 2) * unit
  const px = new Uint8Array(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5
      const cy = y + 0.5
      // tile
      let a = clamp01(0.5 - roundedRectDistance(cx, cy, size, radius))
      let [cr, cg, cb] = bg
      // strokes, composited over the tile (diagonal drawn last, on top)
      const ix = (cx - offset) / unit
      const iy = (cy - offset) / unit
      for (const [seg, color] of [
        ...BARS.map((b) => [b, bars]),
        [DIAG, diag],
      ]) {
        const d = segmentDistance(ix, iy, seg[0], seg[1]) * unit
        const cov = clamp01(r - d + 0.5)
        if (cov > 0) {
          cr = cr + (color[0] - cr) * cov
          cg = cg + (color[1] - cg) * cov
          cb = cb + (color[2] - cb) * cov
          a = a + (1 - a) * cov
        }
      }
      const i = (y * size + x) * 4
      px[i] = Math.round(cr)
      px[i + 1] = Math.round(cg)
      px[i + 2] = Math.round(cb)
      px[i + 3] = Math.round(a * 255)
    }
  }
  return px
}

/* ---------- PNG encoder (RGBA, no filter) ---------- */
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

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    raw.set(
      rgba.subarray(y * size * 4, (y + 1) * size * 4),
      y * (size * 4 + 1) + 1,
    )
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------- the set ---------- */
// Design: 96px tile, 22px radius, 64px mark → radius 22/96, mark 2/3.
const rounded = (size) => ({
  bg: ACCENT,
  radius: (size * 22) / 96,
  iconScale: 2 / 3,
  strokeWidth: 6,
  bars: WHITE,
  diag: WHITE,
})
// Full-bleed variants: iOS rounds the corners itself; Android masks the
// maskable icon, so the mark sits inside the central safe zone.
const fullBleed = (iconScale) => ({
  bg: ACCENT,
  radius: 0,
  iconScale,
  strokeWidth: 6,
  bars: WHITE,
  diag: WHITE,
})

const OUT = [
  ['public/pwa-192x192.png', 192, rounded(192)],
  ['public/pwa-512x512.png', 512, rounded(512)],
  ['public/pwa-maskable-512x512.png', 512, fullBleed(0.58)],
  ['public/apple-touch-icon.png', 180, fullBleed(2 / 3)],
]

for (const [file, size, opts] of OUT) {
  writeFileSync(file, png(size, renderTile(size, opts)))
  console.log('wrote', file)
}
