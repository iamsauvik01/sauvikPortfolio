// Renders a top-down colour preview of the island height function to .shots/terrain.png
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
const T = await import('../src/island/terrain.ts')
const N = 360, S = 64
const px = Buffer.alloc((N * 3 + 1) * N)
for (let j = 0; j < N; j++) {
  px[j * (N * 3 + 1)] = 0
  for (let i = 0; i < N; i++) {
    const x = (i / N - 0.5) * S, z = (j / N - 0.5) * S
    const h = T.heightAt(x, z)
    let c
    if (h < 0) { const d = Math.min(1, -h / 5); c = [60 - d * 40, 190 - d * 120, 200 - d * 60] }
    else if (h < 0.5) c = [235, 210, 160]
    else { const g = Math.min(1, h / 7); c = [90 + g * 120, 150 + g * 60, 70 + g * 90] }
    if (h >= 0 && T.pathDistance(x, z) < 0.8) c = [200, 160, 110]
    for (const [id, s] of Object.entries(T.SITES)) if (Math.hypot(x - s.x, z - s.z) < 0.7) c = [220, 30, 60]
    if (Math.abs(h) < 0.05) c = [255, 255, 255]
    const o = j * (N * 3 + 1) + 1 + i * 3
    px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]
  }
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c })
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0 }
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]) }
const ih = Buffer.alloc(13); ih.writeUInt32BE(N, 0); ih.writeUInt32BE(N, 4); ih[8] = 8; ih[9] = 2
mkdirSync('.shots', { recursive: true })
writeFileSync('.shots/terrain.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(px)), chunk('IEND', Buffer.alloc(0))]))
for (const [id, s] of Object.entries(T.SITES)) console.log(id, T.heightAt(s.x, s.z).toFixed(2), T.coastE(s.x, s.z).toFixed(2))
