import type { ImageResource } from './image-resource.ts'
import type { ResponsiveImageData } from './images.ts'
import type { InfoResource } from './info-resource.ts'

export interface CardContent {
  info: InfoResource
  portrait: ResponsiveImageData
  signature: ImageResource
}
