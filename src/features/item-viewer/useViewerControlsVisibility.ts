import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

const CONTROLS_HIDE_DELAY_MS = 2000

interface UseViewerControlsVisibilityOptions {
  resetKey: string
}

export function useViewerControlsVisibility({
  resetKey,
}: UseViewerControlsVisibilityOptions): {
  controlsVisible: boolean
  keepControlsVisible: () => void
  revealControls: () => void
} {
  const hideTimerRef = useRef<number | undefined>(undefined)
  const keyboardModeRef = useRef(false)
  const [controlsVisible, setControlsVisible] = useState(true)

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== undefined) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = undefined
    }
  }, [])

  const scheduleHide = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = undefined
      setControlsVisible(false)
    }, CONTROLS_HIDE_DELAY_MS)
  }, [clearHideTimer])

  const revealControls = useCallback(() => {
    keyboardModeRef.current = false
    setControlsVisible(true)
    scheduleHide()
  }, [scheduleHide])

  const keepControlsVisible = useCallback(() => {
    keyboardModeRef.current = true
    clearHideTimer()
    setControlsVisible(true)
  }, [clearHideTimer])

  useEffect(() => {
    keyboardModeRef.current = false
    setControlsVisible(true)
    scheduleHide()
    return clearHideTimer
  }, [clearHideTimer, resetKey, scheduleHide])

  return {
    controlsVisible,
    keepControlsVisible,
    revealControls,
  }
}
