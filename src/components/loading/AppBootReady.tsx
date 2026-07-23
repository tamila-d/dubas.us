import { useEffect } from 'react'

const exitDurationMs = 400

function revealApp(): () => void {
  const frame = requestAnimationFrame(() => {
    document.documentElement.dataset.appReady = ''
    window.setTimeout(() => {
      document.getElementById('app-boot')?.remove()
    }, exitDurationMs)
  })

  return () => cancelAnimationFrame(frame)
}

function eventPromise(
  target: EventTarget,
  type: string,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    target.addEventListener(type, () => resolve(), { once: true, signal })
  })
}

function decodeImage(image: HTMLImageElement): Promise<void> {
  if (typeof image.decode !== 'function' || image.naturalWidth === 0) {
    return Promise.resolve()
  }

  return image.decode().catch(() => undefined)
}

function imageReady(
  image: HTMLImageElement,
  signal: AbortSignal,
): Promise<void> {
  if (image.complete) {
    return decodeImage(image)
  }

  return Promise.race([
    eventPromise(image, 'load', signal),
    eventPromise(image, 'error', signal),
  ]).then(() => decodeImage(image))
}

async function appImagesReady(signal: AbortSignal): Promise<void> {
  await Promise.all(
    Array.from(
      document.querySelectorAll<HTMLImageElement>('#root img'),
    ).map((image) => imageReady(image, signal)),
  )
}

export function AppBootReady() {
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    let cancelReveal: (() => void) | undefined
    const windowReady =
      document.readyState === 'complete'
        ? Promise.resolve()
        : eventPromise(window, 'load', signal)
    const stylesReady = Promise.all(
      Array.from(
        document.querySelectorAll<HTMLLinkElement>(
          'link[data-app-stylesheet]',
        ),
      ).map((stylesheet) =>
        stylesheet.dataset.appStylesheet === 'ready'
          ? Promise.resolve()
          : Promise.race([
              eventPromise(stylesheet, 'load', signal),
              eventPromise(stylesheet, 'error', signal),
            ]),
      ),
    )
    const imagesReady = appImagesReady(signal)
    const fontsReady = stylesReady.then(() => document.fonts.ready)

    void Promise.all([
      windowReady,
      stylesReady,
      imagesReady,
      fontsReady,
    ]).then(() => {
      if (!signal.aborted) cancelReveal = revealApp()
    })

    return () => {
      controller.abort()
      cancelReveal?.()
    }
  }, [])

  return null
}
