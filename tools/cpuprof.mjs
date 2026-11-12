// CPU-profiles chosen moments of the journey and prints the hottest functions (self time).
// URL="http://localhost:4180/?debug" node tools/cpuprof.mjs
import { chromium } from 'playwright-core'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.RATE || 1) })
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
async function prof(label, during) {
  await cdp.send('Profiler.start')
  await during()
  const { profile } = await cdp.send('Profiler.stop')
  const self = new Map()
  const dt = profile.timeDeltas
  const byId = new Map(profile.nodes.map((n) => [n.id, n]))
  profile.samples.forEach((id, i) => {
    const n = byId.get(id)
    const f = n.callFrame
    const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`
    self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000)
  })
  const total = [...self.values()].reduce((a, b) => a + b, 0)
  const idle = (self.get('(idle) :-1') || 0) + (self.get('(program) :-1') || 0)
  console.log(`\n== ${label}: busy ${(total - idle).toFixed(0)}ms of ${total.toFixed(0)}ms`)
  ;[...self.entries()].filter(([k]) => !k.startsWith('(idle)') && !k.startsWith('(program)')).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log(`  ${v.toFixed(1).padStart(7)}ms  ${k}`))
}
await page.goto(process.env.URL || 'http://localhost:4180/?debug')
await page.waitForFunction(() => !document.querySelector('[aria-label="Loading the little world"]'), null, { timeout: 90000 })
await prof('landing: island builds in background', () => wait(4500))
await prof('dive + arrival', async () => {
  await page.locator('button.cta').click()
  await wait(6500)
})
await page.locator('.btn-ghost').first().click()
await page.evaluate(() => window.__bit.islandStore.set({ focus: 'workshop' }))
await wait(3500)
await prof('workshop idle 3s', () => wait(3000))
await page.evaluate(() => window.__bit.islandStore.set({ focus: null }))
await wait(3500)
await prof('overview idle 3s', () => wait(3000))
await page.evaluate(() => window.__bit.islandStore.set({ focus: null }))
await wait(3000)
await prof('drag orbit', async () => {
  await page.mouse.move(700, 450)
  await page.mouse.down()
  await page.mouse.move(300, 420, { steps: 60 })
  await page.mouse.up()
})
console.log('\nworld (Bit) canvas calls:', await page.evaluate(() => { const c = document.querySelector('.world canvas'); return c ? `${c.width}x${c.height}` : 'none' }))
await browser.close()
