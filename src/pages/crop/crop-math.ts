export interface CropDimensions {
  height: number
  width: number
}

export interface CropPoint {
  x: number
  y: number
}

export interface CropTransform extends CropPoint {
  scale: number
}

export interface CropScaleBounds {
  max: number
  min: number
}

export interface CropRecipe {
  height: number
  width: number
  x: number
  y: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getCropScaleBounds(
  image: CropDimensions,
  viewportSize: number,
): CropScaleBounds {
  const min = Math.max(
    viewportSize / image.width,
    viewportSize / image.height,
  )

  return {
    min,
    max: Math.max(min, 1),
  }
}

export function constrainCropTransform(
  image: CropDimensions,
  viewportSize: number,
  transform: CropTransform,
): CropTransform {
  const bounds = getCropScaleBounds(image, viewportSize)
  const scale = clamp(transform.scale, bounds.min, bounds.max)
  const horizontalLimit = Math.max(
    0,
    (image.width * scale - viewportSize) / 2,
  )
  const verticalLimit = Math.max(
    0,
    (image.height * scale - viewportSize) / 2,
  )

  return {
    scale,
    x: clamp(transform.x, -horizontalLimit, horizontalLimit),
    y: clamp(transform.y, -verticalLimit, verticalLimit),
  }
}

export function zoomCropAtPoint(
  transform: CropTransform,
  scale: number,
  point: CropPoint,
): CropTransform {
  if (transform.scale <= 0) {
    return {
      scale,
      x: 0,
      y: 0,
    }
  }

  const ratio = scale / transform.scale

  return {
    scale,
    x: point.x - (point.x - transform.x) * ratio,
    y: point.y - (point.y - transform.y) * ratio,
  }
}

export function getCropRecipe(
  image: CropDimensions,
  viewportSize: number,
  transform: CropTransform,
): CropRecipe {
  const rawSize = viewportSize / transform.scale
  const size = clamp(
    Math.round(rawSize),
    1,
    Math.min(image.width, image.height),
  )
  const rawX =
    (image.width - rawSize) / 2 - transform.x / transform.scale
  const rawY =
    (image.height - rawSize) / 2 - transform.y / transform.scale

  return {
    x: clamp(Math.round(rawX), 0, image.width - size),
    y: clamp(Math.round(rawY), 0, image.height - size),
    width: size,
    height: size,
  }
}
