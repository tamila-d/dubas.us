import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
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

function touchPoint(touch: Touch): TrackedPointer {
  return {
    x: touch.clientX,
    y: touch.clientY,
    pointerType: 'touch',
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
  const stageElementRef = useRef<HTMLDivElement>(null)
  const [stageElement, setStageElement] =
    useState<HTMLDivElement | null>(null)
  const [transform, setTransform] = useState(INITIAL_TRANSFORM)
  const transformRef = useRef(transform)
  const pointersRef = useRef(new Map<number, TrackedPointer>())
  const singleGestureRef = useRef<SinglePointerGesture | null>(null)
  const pinchGestureRef = useRef<PinchGesture | null>(null)
  const lastTapRef = useRef<TapRecord | null>(null)
  const usingNativeTouchEventsRef = useRef(false)
  transformRef.current = transform
  const imageWidth = imageSize.width
  const imageHeight = imageSize.height
  const stageRef = useCallback((element: HTMLDivElement | null) => {
    stageElementRef.current = element
    setStageElement(element)
  }, [])

  const viewportSize = useCallback((): ViewerSize => {
    const rect = stageElementRef.current?.getBoundingClientRect()
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
        { width: imageWidth, height: imageHeight },
      )
      return { scale, ...pan }
    },
    [imageHeight, imageWidth, viewportSize],
  )

  const pointFromStageCenter = useCallback(
    (point: ViewerPoint): ViewerPoint => {
      const rect = stageElementRef.current?.getBoundingClientRect()
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
    if (stageElement === null || typeof ResizeObserver === 'undefined') {
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
    observer.observe(stageElement)
    return () => observer.disconnect()
  }, [commitTransform, stageElement, transformAtScale])

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

  const movePinchGesture = useCallback(() => {
    if (pointersRef.current.size !== 2) {
      return false
    }
    if (pinchGestureRef.current === null) {
      startPinchGesture()
      return false
    }

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
    return true
  }, [
    commitTransform,
    pointFromStageCenter,
    startPinchGesture,
    transformAtScale,
  ])

  const moveSingleGesture = useCallback(
    (pointerId: number, point: TrackedPointer) => {
      const single = singleGestureRef.current
      if (
        pointersRef.current.size !== 1 ||
        single?.pointerId !== pointerId ||
        transformRef.current.scale <= VIEWER_MIN_SCALE
      ) {
        return false
      }

      const requestedPan = {
        x: transformRef.current.x + (point.x - single.last.x),
        y: transformRef.current.y + (point.y - single.last.y),
      }
      single.last = point
      commitTransform(
        transformAtScale(transformRef.current.scale, requestedPan),
      )
      return true
    },
    [commitTransform, transformAtScale],
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        event.pointerType === 'touch' &&
        usingNativeTouchEventsRef.current
      ) {
        return
      }
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
      if (
        event.pointerType === 'touch' &&
        usingNativeTouchEventsRef.current
      ) {
        return
      }
      if (!pointersRef.current.has(event.pointerId)) {
        return
      }

      const point = pointerPoint(event)
      pointersRef.current.set(event.pointerId, point)

      if (movePinchGesture()) {
        event.preventDefault()
        return
      }

      if (moveSingleGesture(event.pointerId, point)) {
        event.preventDefault()
      }
    },
    [movePinchGesture, moveSingleGesture],
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

  const completeSingleGesture = useCallback(
    (
      pointerId: number,
      point: TrackedPointer,
      cancelled: boolean,
    ) => {
      const single = singleGestureRef.current
      if (
        cancelled ||
        pointersRef.current.size !== 1 ||
        single?.pointerId !== pointerId ||
        transformRef.current.scale !== VIEWER_MIN_SCALE
      ) {
        return
      }

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
    },
    [handleTouchTap, onNext, onPrevious],
  )

  useEffect(() => {
    if (stageElement === null || typeof TouchEvent === 'undefined') {
      return
    }

    const stage = stageElement
    usingNativeTouchEventsRef.current = true

    const syncTouches = (touches: TouchList) => {
      pointersRef.current.clear()
      for (let index = 0; index < Math.min(touches.length, 2); index += 1) {
        const touch = touches.item(index)
        if (touch !== null) {
          pointersRef.current.set(touch.identifier, touchPoint(touch))
        }
      }
    }

    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault()
      syncTouches(event.touches)

      const current = [...pointersRef.current.entries()]
      if (current.length === 1) {
        startSingleGesture(current[0][0], current[0][1])
        pinchGestureRef.current = null
      } else if (current.length === 2) {
        startPinchGesture()
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault()
      syncTouches(event.touches)

      if (movePinchGesture()) {
        return
      }

      const current = [...pointersRef.current.entries()][0]
      if (current !== undefined) {
        moveSingleGesture(current[0], current[1])
      }
    }

    const finishTouch = (event: TouchEvent, cancelled: boolean) => {
      event.preventDefault()
      const single = singleGestureRef.current
      if (single !== null && pointersRef.current.size === 1) {
        for (
          let index = 0;
          index < event.changedTouches.length;
          index += 1
        ) {
          const touch = event.changedTouches.item(index)
          if (touch?.identifier === single.pointerId) {
            completeSingleGesture(
              single.pointerId,
              touchPoint(touch),
              cancelled,
            )
            break
          }
        }
      }

      syncTouches(event.touches)
      pinchGestureRef.current = null

      const remaining = [...pointersRef.current.entries()][0]
      if (remaining === undefined) {
        singleGestureRef.current = null
      } else {
        startSingleGesture(remaining[0], remaining[1])
      }
    }

    const handleTouchEnd = (event: TouchEvent) =>
      finishTouch(event, false)
    const handleTouchCancel = (event: TouchEvent) =>
      finishTouch(event, true)
    const preventNativeGesture = (event: Event) => event.preventDefault()
    const listenerOptions: AddEventListenerOptions = { passive: false }

    stage.addEventListener('touchstart', handleTouchStart, listenerOptions)
    stage.addEventListener('touchmove', handleTouchMove, listenerOptions)
    stage.addEventListener('touchend', handleTouchEnd, listenerOptions)
    stage.addEventListener(
      'touchcancel',
      handleTouchCancel,
      listenerOptions,
    )
    stage.addEventListener(
      'gesturestart',
      preventNativeGesture,
      listenerOptions,
    )
    stage.addEventListener(
      'gesturechange',
      preventNativeGesture,
      listenerOptions,
    )
    stage.addEventListener(
      'gestureend',
      preventNativeGesture,
      listenerOptions,
    )

    return () => {
      usingNativeTouchEventsRef.current = false
      stage.removeEventListener(
        'touchstart',
        handleTouchStart,
        listenerOptions,
      )
      stage.removeEventListener(
        'touchmove',
        handleTouchMove,
        listenerOptions,
      )
      stage.removeEventListener(
        'touchend',
        handleTouchEnd,
        listenerOptions,
      )
      stage.removeEventListener(
        'touchcancel',
        handleTouchCancel,
        listenerOptions,
      )
      stage.removeEventListener(
        'gesturestart',
        preventNativeGesture,
        listenerOptions,
      )
      stage.removeEventListener(
        'gesturechange',
        preventNativeGesture,
        listenerOptions,
      )
      stage.removeEventListener(
        'gestureend',
        preventNativeGesture,
        listenerOptions,
      )
    }
  }, [
    completeSingleGesture,
    movePinchGesture,
    moveSingleGesture,
    stageElement,
    startPinchGesture,
    startSingleGesture,
  ])

  const endPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
      if (
        event.pointerType === 'touch' &&
        usingNativeTouchEventsRef.current
      ) {
        return
      }
      const point = pointerPoint(event)

      completeSingleGesture(event.pointerId, point, cancelled)

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
    [completeSingleGesture, startSingleGesture],
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
    stageRef,
    transform,
    zoomIn,
    zoomOut,
  }
}
