import { useEffect, useRef, useState } from 'react'
import { gsap, useMediaQuery } from '../hooks/useGsap'
import { appStore } from '../lib/appStore'
import { spiderCtl, triggerSpider } from '../lib/spiderCtl'
import { content } from '../data/portfolio'
import { islandStore } from '../island/store'

/**
 * Bit chats about wherever you are on the island. The bubble sits
 * beside the 3D spider hanging at the edge of the screen. Desktop + 3D only
 * (on phones Bit's lines live inside the story card).
 */
export function GuideBubble() {
  const phase = appStore.use((s) => s.phase)
  const fallback = appStore.use((s) => s.fallback)
  const flat = islandStore.use((s) => s.flat)
  const focus = islandStore.use((s) => s.focus)
  const intro = islandStore.use((s) => s.intro)
  const logbook = islandStore.use((s) => s.logbook)
  const wide = useMediaQuery('(min-width: 1024px)')
  const [text, setText] = useState('')
  const el = useRef<HTMLDivElement>(null)
  const greeted = useRef(false)

  const enabled = wide && !fallback && !flat && phase === 'portfolio'

  // follow Bit on screen (bubble to the right of the spider)
  useEffect(() => {
    if (!enabled) return
    // size is measured only when it changes (no layout reads inside the per-frame loop)
    const size = { w: 0, h: 0 }
    const ro = new ResizeObserver(() => {
      const b = el.current
      if (!b) return
      size.w = b.offsetWidth
      size.h = b.offsetHeight
    })
    if (el.current) ro.observe(el.current)
    let last = ''
    const tick = () => {
      const b = el.current
      if (!b) return
      const s = spiderCtl.screen
      const x = Math.round(Math.max(12, Math.min(window.innerWidth - size.w - 12, s.x + s.r * 0.75)))
      const y = Math.round(Math.max(76, Math.min(window.innerHeight - size.h - 12, s.y - size.h * 0.15)))
      const tf = `translate3d(${x}px, ${y}px, 0)`
      if (tf !== last) b.style.transform = last = tf
    }
    gsap.ticker.add(tick)
    return () => {
      gsap.ticker.remove(tick)
      ro.disconnect()
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const inner = el.current?.firstElementChild
    if (inner) gsap.to(inner, { opacity: 0, duration: 0.2, overwrite: true })
    if (logbook) return
    // the first hello waits for the arrival swoop
    let line = ''
    if (focus) line = content.island[focus].bit
    else if (!intro && !greeted.current) line = content.island.overviewBit
    else if (intro && !greeted.current) line = ''
    if (!line) return
    if (!focus) greeted.current = true
    let hide: ReturnType<typeof setTimeout>
    const show = setTimeout(() => {
      setText(line)
      triggerSpider('hello')
      requestAnimationFrame(() => {
        const n = el.current?.firstElementChild
        if (!n) return
        gsap.fromTo(n, { opacity: 0, scale: 0.85, x: -8 }, { opacity: 1, scale: 1, x: 0, duration: 0.5, ease: 'back.out(2)', overwrite: true })
      })
      hide = setTimeout(() => {
        const n = el.current?.firstElementChild
        if (n) gsap.to(n, { opacity: 0, x: -4, duration: 0.4, overwrite: true })
      }, 6200)
    }, focus ? 1200 : 600)
    return () => {
      clearTimeout(show)
      clearTimeout(hide)
    }
  }, [focus, intro, logbook, enabled])

  if (!enabled) return null
  return (
    <div ref={el} className="pointer-events-none fixed left-0 top-0 z-[56]" role="status" aria-live="polite">
      <div className="bit-bubble" style={{ opacity: 0, transformOrigin: '0% 50%', '--paper': '#fbf4e8' } as React.CSSProperties}>
        <b>{content.mascot}</b>
        {text}
      </div>
    </div>
  )
}
