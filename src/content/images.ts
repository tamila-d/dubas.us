export type ImageTierName = 'card' | 'detail' | 'zoom'
export type GeneratedImageFormat = 'avif' | 'webp' | 'jpg'

export interface ImageFocalPoint {
  x: number
  y: number
}

export interface ImageCrop {
  x: number
  y: number
  size: number
}

export interface ResponsiveSource {
  src: string
  type: string
  width: number
}

export interface ResponsiveImageTier {
  sources: ResponsiveSource[]
  fallback: string
  sizes: string
}

export const IMAGE_TIER_WIDTHS: Record<ImageTierName, readonly number[]> = {
  card: [160, 240],
  detail: [320, 480, 640, 960, 1280],
  zoom: [1920, 2560],
}

export const IMAGE_TIER_SIZES: Record<ImageTierName, string> = {
  card:
    '(max-width: 699px) calc((100vw - 2.75rem) / 2), ' +
    '(max-width: 1099px) calc((100vw - 6rem) / 3), ' +
    'min(calc((100vw - 13.5rem) / 5), 16rem)',
  detail: '(max-width: 767px) calc(100vw - 2rem), min(70vw, 1280px)',
  zoom: '100vw',
}

export const IMAGE_FORMAT_MIME = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpg: 'image/jpeg',
} as const

export const IMAGE_BYTE_BUDGETS: Record<ImageTierName, number> = {
  card: 40_000,
  detail: 900_000,
  zoom: 2_500_000,
}

export const IMAGE_PIPELINE_VERSION = 1

export function widthsForTier(
  sourceWidth: number,
  tier: ImageTierName,
): number[] {
  const widths = IMAGE_TIER_WIDTHS[tier].filter(
    (width) => width <= sourceWidth,
  )

  return widths.length === 0 ? [sourceWidth] : widths
}

export function generatedItemImageUrl(
  domain: 'portfolio' | 'store',
  slug: string,
  imageId: string,
  tier: ImageTierName,
  width: number,
  format: GeneratedImageFormat,
): string {
  return `/content/${domain}/${encodeURIComponent(slug)}/images/generated/${encodeURIComponent(imageId)}/${tier}-${width}.${format}`
}

export function generatedStandaloneImageUrl(
  sourceUrl: string,
  _imageId: string,
  _tier: ImageTierName,
  width: number,
  format: GeneratedImageFormat,
): string {
  const sourceDirectory = sourceUrl.slice(0, sourceUrl.lastIndexOf('/'))
  return `${sourceDirectory}/${width}.${format}`
}

function responsiveTier(
  sourceWidth: number,
  tier: ImageTierName,
  generatedUrl: (
    tier: ImageTierName,
    width: number,
    format: GeneratedImageFormat,
  ) => string,
): ResponsiveImageTier {
  const widths = widthsForTier(sourceWidth, tier)
  const sources: ResponsiveSource[] = widths.flatMap((width) =>
    (Object.keys(IMAGE_FORMAT_MIME) as GeneratedImageFormat[]).map(
      (format) => ({
        src: generatedUrl(tier, width, format),
        type: IMAGE_FORMAT_MIME[format],
        width,
      }),
    ),
  )
  const fallbackWidth = widths.at(-1) ?? sourceWidth

  return {
    sources,
    fallback: generatedUrl(tier, fallbackWidth, 'jpg'),
    sizes: IMAGE_TIER_SIZES[tier],
  }
}

export function createResponsiveImageTiers(
  sourceWidth: number,
  generatedUrl: (
    tier: ImageTierName,
    width: number,
    format: GeneratedImageFormat,
  ) => string,
): Pick<ResponsiveImageData, 'card' | 'detail' | 'zoom'> {
  return {
    card: responsiveTier(sourceWidth, 'card', generatedUrl),
    detail: responsiveTier(sourceWidth, 'detail', generatedUrl),
    zoom: responsiveTier(sourceWidth, 'zoom', generatedUrl),
  }
}

export interface ResponsiveImageData {
  id: string
  alt: string
  width: number
  height: number
  aspectRatio: number
  card: ResponsiveImageTier
  detail: ResponsiveImageTier
  zoom: ResponsiveImageTier
}
