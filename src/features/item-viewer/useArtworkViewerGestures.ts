import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import {
  VIEWER_MIN_SCALE,
  VIEWER_SCALE_STEP,
  clampViewerPan,
  clampViewerScale,
  viewerPanForPinch,
  viewerScaleFromWheel,
  viewerSwipeDirection,
  type ViewerPoint,
  type ViewerSize,
  type ViewerTransform,
} from './viewer-gestures'

interface TrackedPointer extends ViewerPoint {
  pointerType: string
}

interface SinglePointerGesture {
  pointerId: number
  start: ViewerPoint
  last: ViewerPoint
  startedAt: number
  pointerType: string
}

interface PinchGesture {
  distance: number
  midpoint: ViewerPoint
  transform: ViewerTransform
}

interface TapRecord extends ViewerPoint {
  time: number
}

interface UseArtworkViewerGesturesOptions {
  imageSize: ViewerSize
  resetKey: string
  onNext: () => void
  onPrevious: () => void
}

const INITIAL_TRANSFORM: ViewerTransform = {
  scale: VIEWER_MIN_SCALE,
  x: 0,
  y: 0,
}

function pointerPoint(
  event: ReactPointerEvent<HTMLDivElement>,
): TrackedPointer {
  return {
    x: event.clientX,
    y: event.clientY,
    pointerType: event.pointerType,
  }
}

function distance(left: ViewerPoint, right: ViewerPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function midpoint(left: ViewerPoint, right: ViewerPoint): ViewerPoint {
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
  }
}

export function useArtworkViewerGestures({
  imageSize,
  resetKey,
  onNext,
  onPrevious,
}: UseArtworkViewerGesturesOptions) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState(INITIAL_TRANSFORM)
  const transformRef = useRef(transform)
  const pointersRef = useRef(new Map<number, TrackedPointer>())
  const singleGestureRef = useRef<SinglePointerGesture | null>(null)
  const pinchGestureRef = useRef<PinchGesture | null>(null)
  const lastTapRef = useRef<TapRecord | null>(null)
  transformRef.current = transform

  const viewportSize = useCallback((): ViewerSize => {
    const rect = stageRef.current?.getBoundingClientRect()
    return {
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
    }
  }, [])

  const commitTransform = useCallback((next: ViewerTransform) => {
    transformRef.current = next
    setTransform(next)
  }, [])

  const transformAtScale = useCallback(
    (requestedScale: number, requestedPan?: ViewerPoint): ViewerTransform => {
      const scale = clampViewerScale(requestedScale)
      const pan = clampViewerPan(
        requestedPan ?? transformRef.current,
        scale,
        viewportSize(),
        imageSize,
      )
      return { scale, ...pan }
    },
    [imageSize, viewportSize],
  )

  const pointFromStageCenter = useCallback(
    (point: ViewerPoint): ViewerPoint => {
      const rect = stageRef.current?.getBoundingClientRect()
      if (rect === undefined) {
        return { x: 0, y: 0 }
      }

      return {
        x: point.x - (rect.left + rect.width / 2),
        y: point.y - (rect.top + rect.height / 2),
      }
    },
    [],
  )

  const setScale = useCallback(
    (scale: number) => {
      commitTransform(transformAtScale(scale))
    },
    [commitTransform, transformAtScale],
  )

  const zoomIn = useCallback(() => {
    setScale(transformRef.current.scale + VIEWER_SCALE_STEP)
  }, [setScale])

  const zoomOut = useCallback(() => {
    setScale(transformRef.current.scale - VIEWER_SCALE_STEP)
  }, [setScale])

  const resetZoom = useCallback(() => {
    commitTransform(INITIAL_TRANSFORM)
  }, [commitTransform])

  const toggleZoom = useCallback(() => {
    if (transformRef.current.scale > VIEWER_MIN_SCALE) {
      resetZoom()
      return
    }
    setScale(2)
  }, [resetZoom, setScale])

  useEffect(() => {
    resetZoom()
    pointersRef.current.clear()
    singleGestureRef.current = null
    pinchGestureRef.current = null
    lastTapRef.current = null
  }, [resetKey, resetZoom])

  useEffect(() => {
    const stage = stageRef.current
    if (stage === null || typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(() => {
      commitTransform(
        transformAtScale(
          transformRef.current.scale,
          transformRef.current,
        ),
      )
    })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [commitTransform, transformAtScale])

  const startSingleGesture = useCallback(
    (
      pointerId: number,
      point: TrackedPointer,
      startedAt = Date.now(),
    ) => {
      singleGestureRef.current = {
        pointerId,
        start: point,
        last: point,
        startedAt,
        pointerType: point.pointerType,
      }
    },
    [],
  )

  const startPinchGesture = useCallback(() => {
    const points = [...pointersRef.current.values()]
    if (points.length !== 2) {
      pinchGestureRef.current = null
      return
    }
    pinchGestureRef.current = {
      distance: Math.max(distance(points[0], points[1]), 1),
      midpoint: midpoint(points[0], points[1]),
      transform: transformRef.current,
    }
  }, [])

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }

      const point = pointerPoint(event)
      pointersRef.current.set(event.pointerId, point)
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Pointer capture is an enhancement; the gesture still works without it.
      }

      if (pointersRef.current.size === 1) {
        startSingleGesture(event.pointerId, point)
      } else if (pointersRef.current.size === 2) {
        startPinchGesture()
      }
    },
    [startPinchGesture, startSingleGesture],
  )

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return
      }

      const point = pointerPoint(event)
      pointersRef.current.set(event.pointerId, point)

      if (pointersRef.current.size === 2 && pinchGestureRef.current !== null) {
        event.preventDefault()
        const points = [...pointersRef.current.values()]
        const pinch = pinchGestureRef.current
        const currentMidpoint = midpoint(points[0], points[1])
        const scale = clampViewerScale(
          pinch.transform.scale *
            (distance(points[0], points[1]) / pinch.distance),
        )
        const requestedPan = viewerPanForPinch(
          pointFromStageCenter(pinch.midpoint),
          pointFromStageCenter(currentMidpoint),
          pinch.transform,
          scale,
        )
        commitTransform(transformAtScale(scale, requestedPan))
        return
      }

      const single = singleGestureRef.current
      if (
        pointersRef.current.size === 1 &&
        single?.pointerId === event.pointerId &&
        transformRef.current.scale > VIEWER_MIN_SCALE
      ) {
        event.preventDefault()
        const requestedPan = {
          x: transformRef.current.x + (point.x - single.last.x),
          y: transformRef.current.y + (point.y - single.last.y),
        }
        single.last = point
        commitTransform(
          transformAtScale(transformRef.current.scale, requestedPan),
        )
      }
    },
    [commitTransform, pointFromStageCenter, transformAtScale],
  )

  const handleTouchTap = useCallback(
    (point: ViewerPoint) => {
      const previous = lastTapRef.current
      const now = Date.now()
      if (
        previous !== null &&
        now - previous.time <= 320 &&
        distance(previous, point) <= 30
      ) {
        lastTapRef.current = null
        toggleZoom()
        return
      }
      lastTapRef.current = { ...point, time: now }
    },
    [toggleZoom],
  )

  const endPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const single = singleGestureRef.current
      const point = pointerPoint(event)

      if (
        !cancelled &&
        pointersRef.current.size === 1 &&
        single?.pointerId === event.pointerId &&
        transformRef.current.scale === VIEWER_MIN_SCALE
      ) {
        const swipe = viewerSwipeDirection(
          single.start,
          point,
          Date.now() - single.startedAt,
        )
        if (swipe === 'next') {
          onNext()
        } else if (swipe === 'previous') {
          onPrevious()
        } else if (
          single.pointerType === 'touch' &&
          distance(single.start, point) < 8
        ) {
          handleTouchTap(point)
        }
      }

      pointersRef.current.delete(event.pointerId)
      pinchGestureRef.current = null
      try {
        event.currentTarget.releasePointerCapture(event.pointerId)
      } catch {
        // The pointer may already have been released by the browser.
      }

      const remaining = [...pointersRef.current.entries()][0]
      if (remaining === undefined) {
        singleGestureRef.current = null
      } else {
        startSingleGesture(remaining[0], remaining[1])
      }
    },
    [handleTouchTap, onNext, onPrevious, startSingleGesture],
  )

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => endPointer(event, false),
    [endPointer],
  )
  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => endPointer(event, true),
    [endPointer],
  )

  const onDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      toggleZoom()
    },
    [toggleZoom],
  )

  const onWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault()
      const current = transformRef.current
      const scale = viewerScaleFromWheel(current.scale, event.deltaY)
      const point = pointFromStageCenter({
        x: event.clientX,
        y: event.clientY,
      })
      const requestedPan = viewerPanForPinch(
        point,
        point,
        current,
        scale,
      )
      commitTransform(transformAtScale(scale, requestedPan))
    },
    [
      commitTransform,
      pointFromStageCenter,
      transformAtScale,
    ],
  )

  return {
    isZoomed: transform.scale > VIEWER_MIN_SCALE,
    onDoubleClick,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    resetZoom,
    scale: transform.scale,
    stageRef: stageRef as RefObject<HTMLDivElement>,
    transform,
    zoomIn,
    zoomOut,
  }
}
