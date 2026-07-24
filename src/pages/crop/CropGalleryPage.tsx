import {
  generatePath,
  Link,
  useLoaderData,
} from 'react-router-dom'
import { AppBootReady } from '@/components/loading/AppBootReady'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { APP_ROUTES } from '@/config/routes'
import type { PortfolioIndexResource } from '@/content/portfolio-resource'
import {
  usePageMetadata,
  type PageMetadata,
} from '@/hooks/usePageMetadata'
import { useCropSurface } from './useCropSurface'
import styles from './CropGalleryPage.module.css'

const cropGallerySeo: PageMetadata = {
  title: 'Choose artwork to crop — Tamila Dubas',
  description: 'A private tool for preparing square artwork crops.',
  robots: 'noindex,nofollow',
}

export function CropGalleryPage() {
  const { items } = useLoaderData() as PortfolioIndexResource

  usePageMetadata(cropGallerySeo)
  useCropSurface('catalog')

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <p>Private studio tool</p>
          <h1>Choose an artwork</h1>
        </header>

        <ul className={styles.grid}>
          {items.map((item, index) => (
            <li key={item.id}>
              <Link
                aria-label={`Crop ${item.title}`}
                className={styles.link}
                to={generatePath(APP_ROUTES.cropItem, { id: item.id })}
              >
                <Card className={styles.card} size="sm">
                  <div className={styles.media}>
                    <ResponsiveImage
                      className={styles.image}
                      image={item.image}
                      pictureClassName={styles.picture}
                      priority={index < 4}
                      tier="card"
                    />
                  </div>
                  <CardHeader className={styles.cardHeader}>
                    <CardTitle className={styles.title}>
                      {item.title}
                    </CardTitle>
                    <CardDescription>
                      {item.image.width} × {item.image.height}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <AppBootReady />
    </main>
  )
}
