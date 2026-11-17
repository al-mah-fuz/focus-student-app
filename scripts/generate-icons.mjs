import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const publicDir = path.resolve(process.cwd(), 'public');
fs.mkdirSync(publicDir, { recursive: true });

// CRC32 table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function renderIcon(size, { maskable = false, rounded = true } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const scaleFactor = maskable ? 0.68 : 0.84;

  // Star vertices centered at (cx, cy)
  const outerR = size * 0.29 * scaleFactor;
  const innerR = outerR * 0.43;
  const starPoly = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    starPoly.push([cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]);
  }

  const ringR = size * 0.365 * scaleFactor;
  const ringHalfW = size * 0.018 * scaleFactor;
  const cornerR = rounded && !maskable ? size * 0.22 : 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Rounded rect alpha check if applicable
      let alpha = 1;
      if (cornerR > 0) {
        const rx = Math.max(0, Math.abs(x + 0.5 - cx) - (size / 2 - cornerR));
        const ry = Math.max(0, Math.abs(y + 0.5 - cy) - (size / 2 - cornerR));
        const d = Math.hypot(rx, ry);
        if (d > cornerR + 0.5) alpha = 0;
        else if (d > cornerR - 0.5) alpha = Math.max(0, Math.min(1, cornerR + 0.5 - d));
      }

      if (alpha === 0) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Deep Navy gradient background (#141B41 -> #1E2861)
      const grad = (x + y) / (2 * size);
      let r = 20 + grad * 11;
      let g = 27 + grad * 14;
      let b = 65 + grad * 34;

      // Soft lavender subtle radial glow
      const distCenter = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const glow = Math.max(0, 1 - distCenter / (size * 0.48));
      r += glow * 26;
      g += glow * 20;
      b += glow * 52;

      // Soft lavender orbital ring (#A89CF0)
      const ringDist = Math.abs(distCenter - ringR);
      if (ringDist < ringHalfW + 1) {
        const ringAlpha = Math.max(0, Math.min(1, 1 - (ringDist - ringHalfW + 0.5))) * 0.45;
        r = r * (1 - ringAlpha) + 168 * ringAlpha;
        g = g * (1 - ringAlpha) + 156 * ringAlpha;
        b = b * (1 - ringAlpha) + 240 * ringAlpha;
      }

      // 2x2 subpixel anti-aliasing for the warm yellow star (#F5B700 -> #FFD84D)
      let starCov = 0;
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const px = x + 0.25 + sx * 0.5;
          const py = y + 0.25 + sy * 0.5;
          if (pointInPolygon(px, py, starPoly)) {
            starCov += 0.25;
          }
        }
      }

      // Subtle warm highlight edge on star
      let minEdge = 9999;
      for (let i = 0; i < starPoly.length; i++) {
        const next = (i + 1) % starPoly.length;
        const d = distToSegment(x + 0.5, y + 0.5, starPoly[i][0], starPoly[i][1], starPoly[next][0], starPoly[next][1]);
        if (d < minEdge) minEdge = d;
      }

      if (starCov > 0) {
        const starGrad = Math.max(0, Math.min(1, (y - (cy - outerR)) / (outerR * 2)));
        let sr = 255 - starGrad * 10;
        let sg = 216 - starGrad * 33;
        let sb = 77 - starGrad * 77;
        if (minEdge < size * 0.008) {
          sr = 255;
          sg = 242;
          sb = 178;
        }
        r = r * (1 - starCov) + sr * starCov;
        g = g * (1 - starCov) + sg * starCov;
        b = b * (1 - starCov) + sb * starCov;
      }

      buf[idx] = Math.max(0, Math.min(255, Math.round(r)));
      buf[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      buf[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      buf[idx + 3] = Math.max(0, Math.min(255, Math.round(alpha * 255)));
    }
  }

  return encodePNG(size, size, buf);
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), renderIcon(192, { maskable: false, rounded: true }));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), renderIcon(512, { maskable: false, rounded: true }));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), renderIcon(512, { maskable: true, rounded: false }));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderIcon(180, { maskable: false, rounded: false }));
console.log('Generated FOCUS⭐️ PWA PNG icons in public/');
