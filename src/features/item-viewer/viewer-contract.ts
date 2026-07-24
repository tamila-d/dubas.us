import type { ResponsiveImageData } from '@/content/images'

export type ArtworkViewerImage = Pick<
  ResponsiveImageData,
  'alt' | 'aspectRatio' | 'detail' | 'height' | 'id' | 'width' | 'zoom'
>

export interface ImageViewerLabels {
  previousImage: string
  nextImage: string
  zoomIn: string
  zoomOut: string
  resetZoom: string
  imagePosition: string
  zoomLevel: string
  zoomUnavailable: string
  retryZoom: string
}

export function formatViewerPosition(
  template: string,
  current: number,
  total: number,
): string {
  return template
    .replace('{current}', String(current))
    .replace('{total}', String(total))
}

export function formatViewerZoom(template: string, scale: number): string {
  return template.replace('{percent}', String(Math.round(scale * 100)))
}
