export const VIEWER_MIN_SCALE = 1
export const VIEWER_MAX_SCALE = 4
export const VIEWER_SCALE_STEP = 0.25
const VIEWER_WHEEL_SENSITIVITY = 0.0025

export interface ViewerPoint {
  x: number
  y: number
}

export interface ViewerTransform extends ViewerPoint {
  scale: number
}

export interface ViewerSize {
  width: number
  height: number
}

export function shouldPreserveBrowserZoom(
  event: { ctrlKey: boolean; metaKey: boolean },
): boolean {
  return event.ctrlKey || event.metaKey
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export function clampViewerScale(scale: number): number {
  return clamp(scale, VIEWER_MIN_SCALE, VIEWER_MAX_SCALE)
}

export function viewerScaleFromWheel(
  scale: number,
  deltaY: number,
): number {
  const boundedDelta = clamp(deltaY, -120, 120)
  return clampViewerScale(
    scale * Math.exp(-boundedDelta * VIEWER_WHEEL_SENSITIVITY),
  )
}

export function viewerPanForPinch(
  startPoint: ViewerPoint,
  currentPoint: ViewerPoint,
  startTransform: ViewerTransform,
  scale: number,
): ViewerPoint {
  const scaleRatio = scale / startTransform.scale

  return {
    x:
      currentPoint.x -
      (startPoint.x - startTransform.x) * scaleRatio,
    y:
      currentPoint.y -
      (startPoint.y - startTransform.y) * scaleRatio,
  }
}

export function clampViewerPan(
  point: ViewerPoint,
  scale: number,
  viewport: ViewerSize,
  image: ViewerSize,
): ViewerPoint {
  if (
    viewport.width <= 0 ||
    viewport.height <= 0 ||
    image.width <= 0 ||
    image.height <= 0 ||
    scale <= VIEWER_MIN_SCALE
  ) {
    return { x: 0, y: 0 }
  }

  const imageRatio = image.width / image.height
  const viewportRatio = viewport.width / viewport.height
  const fitWidth =
    imageRatio > viewportRatio
      ? viewport.width
      : viewport.height * imageRatio
  const fitHeight =
    imageRatio > viewportRatio
      ? viewport.width / imageRatio
      : viewport.height
  const maximumX = Math.max(0, (fitWidth * scale - viewport.width) / 2)
  const maximumY = Math.max(0, (fitHeight * scale - viewport.height) / 2)

  return {
    x: maximumX === 0 ? 0 : clamp(point.x, -maximumX, maximumX),
    y: maximumY === 0 ? 0 : clamp(point.y, -maximumY, maximumY),
  }
}

export function viewerSwipeDirection(
  start: ViewerPoint,
  end: ViewerPoint,
  duration: number,
): 'next' | 'previous' | undefined {
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y

  if (
    duration > 500 ||
    Math.abs(deltaX) < 56 ||
    Math.abs(deltaX) < Math.abs(deltaY) * 1.35
  ) {
    return undefined
  }

  return deltaX < 0 ? 'next' : 'previous'
}
