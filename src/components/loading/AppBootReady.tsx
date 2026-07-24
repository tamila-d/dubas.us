import { useEffect } from 'react'

const exitDurationMs = 400
const maximumResourceWaitMs = 8_000

function revealApp(): () => void {
  document.documentElement.dataset.appReady = ''
  const removalTimer = window.setTimeout(() => {
    document.getElementById('app-boot')?.remove()
  }, exitDurationMs)

  return () => window.clearTimeout(removalTimer)
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
      document.querySelectorAll<HTMLImageElement>(
        '#root img:not([loading="lazy"])',
      ),
    ).map((image) => imageReady(image, signal)),
  )
}

export function AppBootReady({
  waitForImages = true,
}: {
  waitForImages?: boolean
} = {}) {
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    let cancelReveal: (() => void) | undefined
    let resourceDeadline: number | undefined
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
    const imagesReady = waitForImages
      ? appImagesReady(signal)
      : Promise.resolve()
    const fontsReady = stylesReady.then(() => document.fonts.ready)

    const finishBoot = () => {
      if (signal.aborted || cancelReveal !== undefined) return
      if (resourceDeadline !== undefined) {
        window.clearTimeout(resourceDeadline)
      }
      cancelReveal = revealApp()
      controller.abort()
    }

    resourceDeadline = window.setTimeout(
      finishBoot,
      maximumResourceWaitMs,
    )
    void Promise.all([
      windowReady,
      stylesReady,
      imagesReady,
      fontsReady,
    ]).then(finishBoot)

    return () => {
      if (resourceDeadline !== undefined) {
        window.clearTimeout(resourceDeadline)
      }
      controller.abort()
      cancelReveal?.()
    }
  }, [waitForImages])

  return null
}
