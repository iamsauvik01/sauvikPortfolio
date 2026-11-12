// Visual QA helper: drives a real browser through the experience and saves screenshots.
// Usage: node tools/shoot.mjs [scenario] [width] [height]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const scenario = process.argv[2] || 'landing'
const W = Number(process.argv[3] || 1440)
const H = Number(process.argv[4] || 900)
const OUT = new URL('../.shots/', import.meta.url)
mkdirSync(fileURLToPath(OUT), { recursive: true })
const shot = (p, name) => p.screenshot({ path: fileURLToPath(new URL(`${scenario}-${W}-${name}.png`, OUT)) })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: process.env.NOGL ? ['--disable-webgl', '--disable-3d-apis'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
})
const mobile = W < 700
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
  reducedMotion: process.env.RM ? 'reduce' : 'no-preference',
})
const page = await ctx.newPage()
const logs = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

await page.goto(process.env.URL || 'http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await wait(1200)
await shot(page, '0-loader')
await page.waitForFunction(() => !document.querySelector('[aria-label="Loading the little world"]'), null, { timeout: 30000 }).catch(() => logs.push('loader did not finish'))
await wait(2500)

if (scenario === 'landing' || scenario === 'full') {
  await page.mouse.move(W * 0.5, H * 0.45)
  await wait(900)
  await shot(page, '1-landing-center')
  await page.mouse.move(W * 0.12, H * 0.2, { steps: 8 })
  await wait(900)
  await shot(page, '2-look-topleft')
  await page.mouse.move(W * 0.85, H * 0.75, { steps: 8 })
  await wait(900)
  await shot(page, '3-look-bottomright')
  const cta = page.locator('button.cta')
  await cta.hover()
  await wait(1200)
  await shot(page, '4-cta-hover')
}

if (scenario === 'full' || scenario === 'island') {
  await page.locator('button.cta').click()
  await wait(1400)
  await shot(page, '5-dive')
  await wait(1300)
  await shot(page, '6-iris')
  await wait(1800)
  await shot(page, '7-arrival-swoop')
  await wait(3200)
  await shot(page, '8-arrival')
  const go = async (focus, sub, name, ms = 3400) => {
    await page.evaluate(([f, s]) => {
      const st = window.__bit.islandStore
      const v = st.get().visited
      st.set({ intro: false, focus: f, sub: s, visited: f && !v.includes(f) ? [...v, f] : v })
    }, [focus, sub])
    await wait(ms)
    await shot(page, name)
  }
  await go(null, null, '9-overview', 2600)
  if (process.env.ONLY) {
    for (const spec of process.env.ONLY.split(',')) { const [f, s] = spec.split(':'); await go(f, s || null, 'x-' + spec.replace(':', '-')) }
  } else {
    await go('hut', null, 'a-hut')
    await go('workshop', null, 'b-workshop')
    await go('workshop', 'engine', 'b-workshop-engine', 2600)
    await go('castle', null, 'c-castle')
    await go('castle', 'keep', 'c-castle-keep', 2600)
    await go('lab', null, 'd-lab')
    await go('lab', 'cibf', 'd-lab-cibf', 2600)
    await go('cove', null, 'e-cove')
    await go('cove', 'trophy', 'e-cove-trophy', 2600)
    await go('lighthouse', null, 'f-lighthouse', 4200)
    await page.evaluate(() => window.__bit.islandStore.set({ logbook: true }))
    await wait(1400)
    await shot(page, 'g-logbook')
  }
}

if (scenario === 'interact') {
  const st = () => page.evaluate(() => { const s = window.__bit.islandStore.get(); return { focus: s.focus, sub: s.sub, intro: s.intro, logbook: s.logbook, phase: window.__bit.appStore.get().phase } })
  await page.locator('button.cta').click()
  await wait(7500)
  console.log('after arrival', JSON.stringify(await st()))
  await page.getByRole('button', { name: /wander on my own/i }).click()
  await wait(3000)
  // click the hut in the 3D world (find it by projecting its position)
  const hut = await page.evaluate(() => { const b = [...document.querySelectorAll('.pin')].find((p) => p.textContent.includes('Welcome Hut')); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom + 60 } })
  await page.mouse.move(hut.x, hut.y, { steps: 4 })
  await wait(400)
  console.log('hover over hut 3D', JSON.stringify(await page.evaluate(() => window.__bit.islandStore.get().hover)))
  await page.mouse.click(hut.x, hut.y)
  await wait(3200)
  console.log('clicked hut 3D', JSON.stringify(await st()))
  await shot(page, 'i1-hut-click')
  await page.keyboard.press('ArrowRight')
  await wait(3000)
  console.log('ArrowRight', JSON.stringify(await st()))
  await page.getByRole('button', { name: 'Data Vault', exact: true }).first().click()
  await wait(2600)
  console.log('tag click', JSON.stringify(await st()))
  await shot(page, 'i2-vault')
  await page.keyboard.press('Escape')
  await wait(400)
  console.log('Esc 1', JSON.stringify(await st()))
  await page.keyboard.press('Escape')
  await wait(2500)
  console.log('Esc 2', JSON.stringify(await st()))
  // drag to orbit
  await page.mouse.move(W * 0.5, H * 0.5)
  await page.mouse.down()
  await page.mouse.move(W * 0.25, H * 0.45, { steps: 12 })
  await page.mouse.up()
  await wait(800)
  await shot(page, 'i3-dragged')
  console.log('after drag (should still be overview)', JSON.stringify(await st()))
  await page.keyboard.press('5')
  await wait(3500)
  // click a treasure in 3D: use its tag position, then a bit below
  const tr = await page.evaluate(() => { const b = [...document.querySelectorAll('.tag')].find((p) => p.textContent.includes('Club President')); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom + 110 } })
  await page.mouse.click(tr.x, tr.y)
  await wait(2500)
  console.log('treasure 3D click', JSON.stringify(await st()))
  await shot(page, 'i4-crown')
  await page.getByRole('button', { name: /quick read/i }).click()
  await wait(1200)
  console.log('logbook', JSON.stringify(await st()))
  await page.keyboard.press('Escape')
  await wait(900)
  console.log('logbook esc', JSON.stringify(await st()))
  await page.getByRole('button', { name: /Leave the island/i }).click()
  await wait(3500)
  console.log('left', JSON.stringify(await st()))
  await shot(page, 'i5-landing-again')
  await page.locator('button.cta').click()
  await wait(7500)
  console.log('re-entered', JSON.stringify(await st()))
  await shot(page, 'i6-reenter')
}

console.log(logs.length ? logs.join('\n') : 'no console errors')
await browser.close()
