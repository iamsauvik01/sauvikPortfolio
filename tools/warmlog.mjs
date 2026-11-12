// Prints the island warm-up step timings ([warmup] logs) + long tasks seen on the landing page.
import { chromium } from 'playwright-core'
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const W = Number(process.env.W || 1440), H = Number(process.env.H || 900)
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: Number(process.env.DPR || 1) })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.RATE || 1) })
await page.addInitScript(() => {
  window.__long = []
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true })
})
page.on('console', (m) => m.text().startsWith('[warmup]') && console.log(m.text()))
await page.goto(process.env.URL || 'http://localhost:4180/?debug')
await page.waitForFunction(() => !document.querySelector('[aria-label="Loading the little world"]'), null, { timeout: 90000 })
await page.evaluate(() => (window.__long = []))
const tReady = Date.now()
await page.waitForFunction(() => window.__bit?.islandStore.get().ready, null, { timeout: 90000 })
console.log('ready', ((Date.now() - tReady) / 1000).toFixed(1), 's after the landing appeared; tier', await page.evaluate(() => window.__island?.gl ? 'gl ok' : 'no gl'))
console.log('long tasks after loader (ms):', await page.evaluate(() => window.__long.join(', ')))
await browser.close()
