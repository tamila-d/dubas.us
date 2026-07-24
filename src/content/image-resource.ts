import type {
  ResponsiveImageData,
  ImageTierName,
} from './images.ts'
import {
  IMAGE_TIER_SIZES,
  widthsForTier,
} from './images.ts'

export type ContentImageMimeType =
  | 'image/avif'
  | 'image/jpeg'
  | 'image/svg+xml'
  | 'image/webp'

export interface ImageResourceSource {
  url: string
  type: ContentImageMimeType
}

export interface ImageResourceVariant {
  width: number
  height: number
  sources: ImageResourceSource[]
}

export interface ImageResource {
  schemaVersion: 1
  id: string
  alt: string
  width: number
  height: number
  original: ImageResourceSource
  variants: ImageResourceVariant[]
}

export class ImageResourceValidationError extends Error {
  override name = 'ImageResourceValidationError'
}

function fail(path: string, expectation: string): never {
  throw new ImageResourceValidationError(`${path} must be ${expectation}`)
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'an object')
  }
  return value as Record<string, unknown>
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fail(path, 'a non-empty string')
  }
  return value
}

function positiveInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    return fail(path, 'a positive integer')
  }
  return value as number
}

function mimeType(value: unknown, path: string): ContentImageMimeType {
  const type = string(value, path)
  if (
    type !== 'image/avif' &&
    type !== 'image/jpeg' &&
    type !== 'image/svg+xml' &&
    type !== 'image/webp'
  ) {
    return fail(path, 'a supported image MIME type')
  }
  return type
}

function source(
  value: unknown,
  path: string,
  expectedPrefix: string,
): ImageResourceSource {
  const input = record(value, path)
  const url = string(input.url, `${path}.url`)
  if (
    !url.startsWith(expectedPrefix) ||
    url.includes('..') ||
    url.includes('\\') ||
    url.includes('?') ||
    url.includes('#')
  ) {
    return fail(`${path}.url`, `a URL under ${expectedPrefix}`)
  }
  return {
    url,
    type: mimeType(input.type, `${path}.type`),
  }
}

export function validateImageResource(
  value: unknown,
  expectedId?: string,
): ImageResource {
  const input = record(value, 'image')
  if (input.schemaVersion !== 1) {
    return fail('image.schemaVersion', 'schema version 1')
  }
  const id = string(input.id, 'image.id')
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(id)) {
    return fail('image.id', 'a URL-safe alphanumeric id')
  }
  if (expectedId !== undefined && id !== expectedId) {
    return fail('image.id', `"${expectedId}"`)
  }

  const expectedPrefix = `/content/images/${encodeURIComponent(id)}/`
  if (!Array.isArray(input.variants)) {
    return fail('image.variants', 'an array')
  }
  const widths = new Set<number>()
  const variants = input.variants.map((value, variantIndex) => {
    const path = `image.variants[${variantIndex}]`
    const variant = record(value, path)
    const width = positiveInteger(variant.width, `${path}.width`)
    const height = positiveInteger(variant.height, `${path}.height`)
    if (widths.has(width)) {
      return fail(`${path}.width`, 'unique')
    }
    widths.add(width)
    if (!Array.isArray(variant.sources) || variant.sources.length === 0) {
      return fail(`${path}.sources`, 'a non-empty array')
    }
    return {
      width,
      height,
      sources: variant.sources.map((item, sourceIndex) =>
        source(
          item,
          `${path}.sources[${sourceIndex}]`,
          expectedPrefix,
        ),
      ),
    }
  })

  return {
    schemaVersion: 1,
    id,
    alt: string(input.alt, 'image.alt'),
    width: positiveInteger(input.width, 'image.width'),
    height: positiveInteger(input.height, 'image.height'),
    original: source(input.original, 'image.original', expectedPrefix),
    variants,
  }
}

function responsiveTier(
  image: ImageResource,
  tier: ImageTierName,
): ResponsiveImageData[ImageTierName] {
  const expectedWidths = new Set(widthsForTier(image.width, tier))
  const variants = image.variants.filter((variant) =>
    expectedWidths.has(variant.width),
  )
  const sources = variants.flatMap((variant) =>
    variant.sources.flatMap((source) =>
      source.type === 'image/svg+xml'
        ? []
        : [{
            src: source.url,
            type: source.type,
            width: variant.width,
          }],
    ),
  )
  const webpFallback = sources.reduce<
    (typeof sources)[number] | undefined
  >(
    (largest, candidate) =>
      candidate.type === 'image/webp' &&
      (largest === undefined || candidate.width > largest.width)
        ? candidate
        : largest,
    undefined,
  )

  return {
    sources,
    fallback: webpFallback?.src ?? image.original.url,
    sizes: IMAGE_TIER_SIZES[tier],
  }
}

export function imageResourceToResponsiveData(
  image: ImageResource,
): ResponsiveImageData {
  return {
    id: image.id,
    alt: image.alt,
    width: image.width,
    height: image.height,
    aspectRatio: image.width / image.height,
    card: responsiveTier(image, 'card'),
    detail: responsiveTier(image, 'detail'),
    zoom: responsiveTier(image, 'zoom'),
  }
}
