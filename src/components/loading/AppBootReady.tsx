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

export function AppBootReady() {
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    let cancelReveal: (() => void) | undefined
    let resourceDeadline: number | undefined
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
    void Promise.all([stylesReady, fontsReady]).then(finishBoot)

    return () => {
      if (resourceDeadline !== undefined) {
        window.clearTimeout(resourceDeadline)
      }
      controller.abort()
      cancelReveal?.()
    }
  }, [])

  return null
}
