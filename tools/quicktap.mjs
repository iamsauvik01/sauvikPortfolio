// Worst case: slow phone, visitor taps DISCOVER the moment the landing appears.
import { chromium } from 'playwright-core'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const W = Number(process.env.W || 390), H = Number(process.env.H || 844)
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: Number(process.env.DPR || 2) })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.RATE || 4) })
await page.addInitScript(() => {
  window.__long = []
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true })
})
await page.goto(process.env.URL || 'http://localhost:4180/?debug')
await page.waitForFunction(() => !document.querySelector('[aria-label="Loading the little world"]'), null, { timeout: 90000 })
await wait(Number(process.env.DELAY || 300))
await page.evaluate(() => (window.__long = []))
const t0 = Date.now()
await page.locator('button.cta').click()
await page.waitForFunction(() => window.__bit.islandStore.get().ready, null, { timeout: 60000 })
const tReady = Date.now() - t0
await wait(5000)
console.log(`island ready ${(tReady / 1000).toFixed(1)}s after tap; long tasks during dive+arrival (ms): ${(await page.evaluate(() => window.__long)).join(', ')}`)
await page.screenshot({ path: '.shots/quicktap.png' })
await browser.close()
