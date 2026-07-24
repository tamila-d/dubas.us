import {
  lazy,
  Suspense,
  useRef,
  useState,
} from 'react'
import {
  ExpandIcon,
  MapPinIcon,
} from 'lucide-react'
import {
  useLoaderData,
  useRouteLoaderData,
} from 'react-router-dom'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { PortfolioBackButton } from '@/components/navigation/PortfolioBackButton'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { APP_ROUTE_IDS } from '@/config/routes'
import type { CardContent } from '@/content/card-types'
import type {
  PortfolioItemDetailResource,
  PortfolioItemResource,
} from '@/content/portfolio-resource'
import type {
  ArtworkViewerImage,
  ImageViewerLabels,
} from '@/features/item-viewer/viewer-contract'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import styles from './PortfolioItemPage.module.css'

const ArtworkViewer = lazy(() =>
  import('@/features/item-viewer/ArtworkViewer').then(
    ({ ArtworkViewer }) => ({ default: ArtworkViewer }),
  ),
)

const viewerLabels: ImageViewerLabels = {
  previousImage: 'Previous image',
  nextImage: 'Next image',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetZoom: 'Reset zoom',
  imagePosition: 'Image {current} of {total}',
  zoomLevel: 'Zoom {percent}%',
  zoomUnavailable: 'The larger image could not be loaded.',
  retryZoom: 'Try again',
}

function formatDate(createdAt: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${createdAt}T00:00:00Z`))
}

function formatType(type: string): string {
  const label = type.replaceAll('-', ' ')
  return `${label[0]?.toUpperCase() ?? ''}${label.slice(1)}`
}

function mapUrl(item: PortfolioItemResource): string {
  const query = `${item.coordinates.latitude},${item.coordinates.longitude}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function ViewerFallback({
  image,
  onClose,
  title,
}: {
  image: PortfolioItemDetailResource['image']
  onClose: () => void
  title: string
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className={styles.viewerFallback}>
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Preparing the full-screen artwork viewer.
          </DialogDescription>
        </DialogHeader>
        <ResponsiveImage
          className={styles.viewerFallbackImage}
          image={image}
          pictureClassName={styles.viewerFallbackPicture}
          priority
          tier="detail"
        />
      </DialogContent>
    </Dialog>
  )
}

export function PortfolioItemPage() {
  const { item, image } =
    useLoaderData() as PortfolioItemDetailResource
  const { info } = useRouteLoaderData(
    APP_ROUTE_IDS.shell,
  ) as Pick<CardContent, 'info'>
  const imageButtonRef = useRef<HTMLButtonElement>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const displayName = `${info.artist.firstName} ${info.artist.lastName}`
  const detailImage: ArtworkViewerImage = image
  const date =
    item.createdAt === null
      ? undefined
      : formatDate(item.createdAt, info.locale)

  useDocumentTitle(`${item.title} — ${displayName}`)

  const preloadViewer = () => {
    void import('@/features/item-viewer/ArtworkViewer')
  }

  return (
    <article className={styles.page}>
      <div className={styles.backRow}>
        <PortfolioBackButton />
      </div>

      <div className={styles.layout}>
        <div className={styles.artworkSurface}>
          <Button
            aria-label={`View ${item.title} full screen`}
            className={styles.imageButton}
            onClick={() => setViewerOpen(true)}
            onFocus={preloadViewer}
            onPointerEnter={preloadViewer}
            onPointerDown={preloadViewer}
            ref={imageButtonRef}
            type="button"
            variant="ghost"
          >
            <ResponsiveImage
              className={styles.image}
              image={image}
              pictureClassName={styles.picture}
              priority
              tier="detail"
            />
            <Badge className={styles.expandHint}>
              <ExpandIcon aria-hidden="true" data-icon="inline-start" />
              View full screen
            </Badge>
          </Button>
        </div>

        <div className={styles.copy}>
          <p className={styles.type}>{formatType(item.type)}</p>
          <h1>{item.title}</h1>
          <p className={styles.description}>{item.description}</p>

          <Separator />

          <dl className={styles.metadata}>
            {date === undefined ? null : (
              <div>
                <dt>Created</dt>
                <dd>{date}</dd>
              </div>
            )}
            <div>
              <dt>Location</dt>
              <dd>{item.location}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{formatType(item.type)}</dd>
            </div>
          </dl>

          <a
            className={cn(
              buttonVariants({ size: 'touch' }),
              styles.mapLink,
            )}
            href={mapUrl(item)}
            rel="noreferrer"
            target="_blank"
          >
            <MapPinIcon data-icon="inline-start" />
            Open location
          </a>
        </div>
      </div>

      {viewerOpen ? (
        <Suspense
          fallback={
            <ViewerFallback
              image={image}
              onClose={() => setViewerOpen(false)}
              title={item.title}
            />
          }
        >
          <ArtworkViewer
            closeImageLabel="Close full-screen image"
            finalFocus={imageButtonRef}
            images={[detailImage]}
            labels={viewerLabels}
            onClose={() => setViewerOpen(false)}
            onSelectImage={() => undefined}
            selectedId={detailImage.id}
            title={item.title}
          />
        </Suspense>
      ) : null}
    </article>
  )
}
