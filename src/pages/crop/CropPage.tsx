import { useMemo } from 'react'
import { useLoaderData } from 'react-router-dom'
import { AppBootReady } from '@/components/loading/AppBootReady'
import type { PortfolioItemDetailResource } from '@/content/portfolio-resource'
import {
  usePageMetadata,
  type PageMetadata,
} from '@/hooks/usePageMetadata'
import {
  CropWorkspace,
  type CropImageSource,
} from './CropWorkspace'
import { useCropSurface } from './useCropSurface'
import styles from './CropPage.module.css'

export function CropPage() {
  const { item, image } =
    useLoaderData() as PortfolioItemDetailResource
  const seo: PageMetadata = useMemo(
    () => ({
      title: `Crop ${item.title} — Tamila Dubas`,
      description: 'A private tool for preparing square artwork crops.',
      robots: 'noindex,nofollow',
    }),
    [item.title],
  )
  const cropImage: CropImageSource = useMemo(
    () => ({
      height: image.height,
      id: item.id,
      key: image.original.url,
      url: image.original.url,
      width: image.width,
    }),
    [image, item.id],
  )

  usePageMetadata(seo)
  useCropSurface('editor')

  return (
    <section className={styles.page}>
      <CropWorkspace image={cropImage} />
      <AppBootReady />
    </section>
  )
}
