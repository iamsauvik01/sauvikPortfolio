// Performance profile of the whole journey (run against a production build).
// Usage: node tools/perf.mjs [cpuThrottle=1] [width=1440] [height=900]
//   URL=http://localhost:4180/ node tools/perf.mjs 4
// Reports, per phase: fps, p95 frame time, janky frames (>33ms), long main-thread tasks,
// and how much of each frame went to script / layout / style recalculation.
import { chromium } from 'playwright-core'

const RATE = Number(process.argv[2] || 1)
const W = Number(process.argv[3] || 1440)
const H = Number(process.argv[4] || 900)
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
})
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: Number(process.env.DPR || 1) })
const page = await ctx.newPage()
await page.addInitScript(() => {
  window.__long = []
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push({ t: e.startTime, d: e.duration }))).observe({ type: 'longtask', buffered: true })
})
const cdp = await ctx.newCDPSession(page)
await cdp.send('Performance.enable')
const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]))

async function measure(label, ms, during) {
  const m0 = await metrics()
  const t0 = await page.evaluate(() => performance.now())
  const frames = page.evaluate(
    (ms) =>
      new Promise((res) => {
        const d = []
        let last = performance.now()
        const start = last
        const f = (t) => {
          d.push(t - last)
          last = t
          if (t - start < ms) requestAnimationFrame(f)
          else res(d)
        }
        requestAnimationFrame(f)
      }),
    ms,
  )
  if (during) await during()
  const d = (await frames).slice(1).sort((a, b) => a - b)
  const m1 = await metrics()
  const t1 = await page.evaluate(() => performance.now())
  const longs = await page.evaluate(([a, b]) => window.__long.filter((l) => l.t >= a && l.t <= b), [t0, t1])
  const n = d.length
  const per = (k) => (((m1[k] - m0[k]) * 1000) / Math.max(1, n)).toFixed(2)
  console.log(
    `${label.padEnd(26)} fps ${((n / ms) * 1000).toFixed(0).padStart(4)} | p50 ${d[Math.floor(n * 0.5)].toFixed(1).padStart(5)}ms p95 ${d[Math.floor(n * 0.95)].toFixed(1).padStart(5)}ms max ${d[n - 1].toFixed(0).padStart(4)}ms | >33ms: ${String(d.filter((x) => x > 33).length).padStart(3)} | long tasks ${longs.length} (max ${Math.round(Math.max(0, ...longs.map((l) => l.d)))}ms) | per frame: script ${per('ScriptDuration')} layout ${per('LayoutDuration')} style ${per('RecalcStyleDuration')} ms`,
  )
}

await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE })
console.log(`CPU throttle ${RATE}x, ${W}x${H} @${process.env.DPR || 1}x`)
const tLoad = Date.now()
await page.goto(process.env.URL || 'http://localhost:4180/')
await page.waitForFunction(() => !document.querySelector('[aria-label="Loading the little world"]'), null, { timeout: 90000 })
console.log(`loader done after ${((Date.now() - tLoad) / 1000).toFixed(1)}s`)
await page.mouse.move(W * 0.5, H * 0.45)

// the island is built in the background ~2s after the landing appears — measure that window
await measure('landing (island builds)', 5000, async () => {
  for (let i = 0; i < 10; i++) {
    await page.mouse.move(W * (0.3 + i * 0.04), H * (0.4 + (i % 3) * 0.05), { steps: 4 })
    await wait(400)
  }
})
await measure('landing idle', 3000)
await measure('dive + iris + arrival', 7000, async () => {
  await page.locator('button.cta').click()
})
await page.locator('.btn-ghost').first().click()
await wait(1500)
await measure('island overview', 3000, async () => {
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(W * (0.3 + i * 0.05), H * 0.5, { steps: 5 })
    await wait(300)
  }
})
const go = (f, s = null) => page.evaluate(([f, s]) => window.__bit.islandStore.set({ focus: f, sub: s }), [f, s])
await measure('fly → workshop + panel', 3500, () => go('workshop'))
await measure('workshop idle', 3000)
await measure('fly → lab, project', 3500, async () => {
  await go('lab')
  await wait(1500)
  await go('lab', 'cibf')
})
await measure('fly → lighthouse (night)', 4000, () => go('lighthouse'))
await measure('lighthouse idle', 3000)
await measure('drag orbit', 3000, async () => {
  await go(null)
  await wait(1200)
  await page.mouse.move(W * 0.5, H * 0.5)
  await page.mouse.down()
  await page.mouse.move(W * 0.2, H * 0.45, { steps: 40 })
  await page.mouse.up()
})
console.log(
  'island renderer',
  await page.evaluate(() => {
    const g = window.__island?.gl
    return g ? JSON.stringify({ calls: g.info.render.calls, tris: g.info.render.triangles, dpr: g.getPixelRatio(), geos: g.info.memory.geometries, tex: g.info.memory.textures }) : 'n/a (prod build)'
  }),
)
await browser.close()
