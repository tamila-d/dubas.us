import { useLayoutEffect } from 'react'

export function useCropSurface(surface: 'catalog' | 'editor'): void {
  useLayoutEffect(() => {
    const html = document.documentElement
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    )
    const previousSurface = html.dataset.pageSurface
    const previousThemeColor = themeColor?.content

    html.dataset.pageSurface = surface === 'editor' ? 'crop' : 'content'
    themeColor?.setAttribute(
      'content',
      surface === 'editor' ? '#171717' : '#ffffff',
    )

    return () => {
      if (previousSurface === undefined) {
        delete html.dataset.pageSurface
      } else {
        html.dataset.pageSurface = previousSurface
      }

      if (previousThemeColor !== undefined) {
        themeColor?.setAttribute('content', previousThemeColor)
      }
    }
  }, [surface])
}
