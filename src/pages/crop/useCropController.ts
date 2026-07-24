import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEventHandler,
  type PointerEventHandler,
  type RefObject,
  type WheelEventHandler,
} from 'react'
import {
  constrainCropTransform,
  getCropRecipe,
  getCropScaleBounds,
  zoomCropAtPoint,
  type CropDimensions,
  type CropPoint,
  type CropRecipe,
  type CropTransform,
} from './crop-math'

interface CropControllerState {
  sourceKey: string
  transform: CropTransform
  viewportSize: number
}

interface GestureSnapshot {
  center: CropPoint
  distance: number
  pointers: number
}

interface UseCropControllerResult {
  cropRef: RefObject<HTMLDivElement | null>
  handlers: {
    onDoubleClick: () => void
    onKeyDown: KeyboardEventHandler<HTMLDivElement>
    onPointerCancel: PointerEventHandler<HTMLDivElement>
    onPointerDown: PointerEventHandler<HTMLDivElement>
    onPointerMove: PointerEventHandler<HTMLDivElement>
    onPointerUp: PointerEventHandler<HTMLDivElement>
    onWheel: WheelEventHandler<HTMLDivElement>
  }
  maxZoom: number
  recipe: CropRecipe | null
  reset: () => void
  setZoom: (zoom: number) => void
  transform: CropTransform
  viewportSize: number
  zoom: number
}

const INITIAL_TRANSFORM: CropTransform = {
  scale: 0,
  x: 0,
  y: 0,
}

function pointerSnapshot(
  points: Map<number, CropPoint>,
): GestureSnapshot | null {
  const active = Array.from(points.values()).slice(0, 2)

  if (active.length === 0) {
    return null
  }

  if (active.length === 1) {
    return {
      center: active[0],
      distance: 0,
      pointers: 1,
    }
  }

  const [first, second] = active

  return {
    center: {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    },
    distance: Math.hypot(
      second.x - first.x,
      second.y - first.y,
    ),
    pointers: 2,
  }
}

export function useCropController(
  image: CropDimensions & { key: string },
): UseCropControllerResult {
  const cropRef = useRef<HTMLDivElement>(null)
  const pointersRef = useRef(new Map<number, CropPoint>())
  const gestureRef = useRef<GestureSnapshot | null>(null)
  const [state, setState] = useState<CropControllerState>({
    sourceKey: image.key,
    transform: INITIAL_TRANSFORM,
    viewportSize: 0,
  })
  const stateRef = useRef(state)

  const commitState = useCallback((next: CropControllerState) => {
    stateRef.current = next
    setState(next)
  }, [])

  const commitTransform = useCallback(
    (transform: CropTransform) => {
      const current = stateRef.current

      if (current.viewportSize <= 0) {
        return
      }

      commitState({
        ...current,
        transform: constrainCropTransform(
          image,
          current.viewportSize,
          transform,
        ),
      })
    },
    [commitState, image],
  )

  const updateViewport = useCallback(
    (viewportSize: number) => {
      if (viewportSize <= 0) {
        return
      }

      const current = stateRef.current
      const nextBounds = getCropScaleBounds(image, viewportSize)

      if (
        current.viewportSize <= 0 ||
        current.transform.scale <= 0 ||
        current.sourceKey !== image.key
      ) {
        commitState({
          sourceKey: image.key,
          viewportSize,
          transform: {
            scale: nextBounds.min,
            x: 0,
            y: 0,
          },
        })
        return
      }

      const previousBounds = getCropScaleBounds(
        image,
        current.viewportSize,
      )
      const zoom = current.transform.scale / previousBounds.min
      const scale = Math.min(
        nextBounds.max,
        Math.max(nextBounds.min, nextBounds.min * zoom),
      )
      const sourceCenter = {
        x:
          image.width / 2 -
          current.transform.x / current.transform.scale,
        y:
          image.height / 2 -
          current.transform.y / current.transform.scale,
      }

      commitState({
        sourceKey: image.key,
        viewportSize,
        transform: constrainCropTransform(image, viewportSize, {
          scale,
          x: (image.width / 2 - sourceCenter.x) * scale,
          y: (image.height / 2 - sourceCenter.y) * scale,
        }),
      })
    },
    [commitState, image],
  )

  useEffect(() => {
    const crop = cropRef.current

    if (crop === null) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      updateViewport(Math.min(
        entry.contentRect.width,
        entry.contentRect.height,
      ))
    })

    observer.observe(crop)

    return () => observer.disconnect()
  }, [updateViewport])

  useEffect(() => {
    const current = stateRef.current

    if (
      current.sourceKey !== image.key &&
      current.viewportSize > 0
    ) {
      const bounds = getCropScaleBounds(
        image,
        current.viewportSize,
      )

      commitState({
        sourceKey: image.key,
        viewportSize: current.viewportSize,
        transform: {
          scale: bounds.min,
          x: 0,
          y: 0,
        },
      })
    }
  }, [commitState, image])

  const bounds = useMemo(
    () =>
      state.viewportSize > 0
        ? getCropScaleBounds(image, state.viewportSize)
        : { min: 1, max: 1 },
    [image, state.viewportSize],
  )
  const zoom = state.transform.scale > 0
    ? state.transform.scale / bounds.min
    : 1
  const maxZoom = bounds.max / bounds.min
  const recipe = useMemo(
    () =>
      state.viewportSize > 0 && state.transform.scale > 0
        ? getCropRecipe(
            image,
            state.viewportSize,
            state.transform,
          )
        : null,
    [image, state.transform, state.viewportSize],
  )

  const reset = useCallback(() => {
    const current = stateRef.current

    if (current.viewportSize <= 0) {
      return
    }

    const nextBounds = getCropScaleBounds(
      image,
      current.viewportSize,
    )

    commitTransform({
      scale: nextBounds.min,
      x: 0,
      y: 0,
    })
  }, [commitTransform, image])

  const setZoom = useCallback(
    (nextZoom: number) => {
      const current = stateRef.current

      if (
        current.viewportSize <= 0 ||
        current.transform.scale <= 0
      ) {
        return
      }

      const nextBounds = getCropScaleBounds(
        image,
        current.viewportSize,
      )
      const scale = Math.min(
        nextBounds.max,
        Math.max(nextBounds.min, nextBounds.min * nextZoom),
      )

      commitTransform(
        zoomCropAtPoint(current.transform, scale, { x: 0, y: 0 }),
      )
    },
    [commitTransform, image],
  )

  const updateGesture = useCallback(() => {
    gestureRef.current = pointerSnapshot(pointersRef.current)
  }, [])

  const onPointerDown = useCallback<PointerEventHandler<HTMLDivElement>>(
    (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }

      event.currentTarget.setPointerCapture(event.pointerId)
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })
      updateGesture()
    },
    [updateGesture],
  )

  const onPointerMove = useCallback<PointerEventHandler<HTMLDivElement>>(
    (event) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return
      }

      event.preventDefault()
      const previousGesture = gestureRef.current
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })
      const nextGesture = pointerSnapshot(pointersRef.current)

      if (
        previousGesture === null ||
        nextGesture === null ||
        previousGesture.pointers !== nextGesture.pointers
      ) {
        gestureRef.current = nextGesture
        return
      }

      const current = stateRef.current

      if (previousGesture.pointers === 1) {
        commitTransform({
          ...current.transform,
          x:
            current.transform.x +
            nextGesture.center.x -
            previousGesture.center.x,
          y:
            current.transform.y +
            nextGesture.center.y -
            previousGesture.center.y,
        })
      } else if (
        previousGesture.distance > 0 &&
        nextGesture.distance > 0
      ) {
        const crop = cropRef.current

        if (crop !== null) {
          const rect = crop.getBoundingClientRect()
          const previousCenter = {
            x:
              previousGesture.center.x -
              rect.left -
              rect.width / 2,
            y:
              previousGesture.center.y -
              rect.top -
              rect.height / 2,
          }
          const nextCenter = {
            x:
              nextGesture.center.x -
              rect.left -
              rect.width / 2,
            y:
              nextGesture.center.y -
              rect.top -
              rect.height / 2,
          }
          const currentBounds = getCropScaleBounds(
            image,
            current.viewportSize,
          )
          const requestedScale =
            current.transform.scale *
            (nextGesture.distance / previousGesture.distance)
          const scale = Math.min(
            currentBounds.max,
            Math.max(currentBounds.min, requestedScale),
          )
          const scaled = zoomCropAtPoint(
            current.transform,
            scale,
            previousCenter,
          )

          commitTransform({
            ...scaled,
            x: scaled.x + nextCenter.x - previousCenter.x,
            y: scaled.y + nextCenter.y - previousCenter.y,
          })
        }
      }

      gestureRef.current = nextGesture
    },
    [commitTransform, image],
  )

  const finishPointer = useCallback<PointerEventHandler<HTMLDivElement>>(
    (event) => {
      pointersRef.current.delete(event.pointerId)

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      updateGesture()
    },
    [updateGesture],
  )

  const onWheel = useCallback<WheelEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault()
      const current = stateRef.current
      const crop = cropRef.current

      if (
        crop === null ||
        current.viewportSize <= 0 ||
        current.transform.scale <= 0
      ) {
        return
      }

      const rect = crop.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2,
      }
      const currentBounds = getCropScaleBounds(
        image,
        current.viewportSize,
      )
      const requestedScale =
        current.transform.scale * Math.exp(-event.deltaY * 0.0015)
      const scale = Math.min(
        currentBounds.max,
        Math.max(currentBounds.min, requestedScale),
      )

      commitTransform(
        zoomCropAtPoint(current.transform, scale, point),
      )
    },
    [commitTransform, image],
  )

  const onKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (event) => {
      const current = stateRef.current
      const movement = event.shiftKey ? 24 : 8
      const transform = { ...current.transform }

      switch (event.key) {
        case 'ArrowLeft':
          transform.x -= movement
          break
        case 'ArrowRight':
          transform.x += movement
          break
        case 'ArrowUp':
          transform.y -= movement
          break
        case 'ArrowDown':
          transform.y += movement
          break
        case '+':
        case '=':
          setZoom(zoom * 1.08)
          event.preventDefault()
          return
        case '-':
          setZoom(zoom / 1.08)
          event.preventDefault()
          return
        case '0':
          reset()
          event.preventDefault()
          return
        default:
          return
      }

      event.preventDefault()
      commitTransform(transform)
    },
    [commitTransform, reset, setZoom, zoom],
  )

  return {
    cropRef,
    handlers: {
      onDoubleClick: reset,
      onKeyDown,
      onPointerCancel: finishPointer,
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointer,
      onWheel,
    },
    maxZoom,
    recipe,
    reset,
    setZoom,
    transform: state.transform,
    viewportSize: state.viewportSize,
    zoom,
  }
}
