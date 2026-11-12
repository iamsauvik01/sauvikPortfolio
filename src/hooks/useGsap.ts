import { useLayoutEffect, useEffect, useState, type DependencyList, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)
ScrollTrigger.config({ ignoreMobileResize: true })

export { gsap, ScrollTrigger }

/**
 * Scoped GSAP context: every tween / ScrollTrigger created inside `fn`
 * is reverted automatically on unmount or when deps change.
 */
export function useGsap(fn: (ctx: gsap.Context) => void | (() => void), deps: DependencyList, scope?: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const ctx = gsap.context((self) => fn(self), scope?.current ?? undefined)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
