import { useSyncExternalStore } from 'react'

/** Breakpoint `md` do Tailwind. */
export const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Casa a media query já no primeiro render. Usado onde desktop e mobile têm
 * composições diferentes: renderizar só uma evita baixar as imagens da oculta.
 */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
  )
}
