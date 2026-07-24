import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
  type SyntheticEvent,
} from 'react'
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useArtworkViewerGestures } from './useArtworkViewerGestures'
import { useViewerControlsVisibility } from './useViewerControlsVisibility'
import {
  VIEWER_MAX_SCALE,
  VIEWER_MIN_SCALE,
  shouldPreserveBrowserZoom,
} from './viewer-gestures'
import {
  type ArtworkViewerImage,
  formatViewerPosition,
  formatViewerZoom,
  type ImageViewerLabels,
} from './viewer-contract'
import styles from './ArtworkViewer.module.css'

interface ArtworkViewerProps {
  closeImageLabel: string
  finalFocus?: RefObject<HTMLElement | null>
  images: readonly ArtworkViewerImage[]
  labels: ImageViewerLabels
  onClose: () => void
  onOpenDetails?: (imageId: string) => void
  onSelectImage: (imageId: string) => void
  selectedId: string
  title: string
}

type ZoomState =
  | { key: string; status: 'ready' }
  | { key: string; status: 'error' }
  | { key: ''; status: 'pending' }

function neighborIndexes(current: number, total: number): number[] {
  if (total <= 1) {
    return []
  }
  const previous = (current - 1 + total) % total
  const next = (current + 1) % total
  return previous === next ? [previous] : [previous, next]
}

export function ArtworkViewer({
  closeImageLabel,
  finalFocus,
  images,
  labels,
  onClose,
  onOpenDetails,
  onSelectImage,
  selectedId,
  title,
}: ArtworkViewerProps) {
  const selectedIndex = Math.max(
    0,
    images.findIndex((image) => image.id === selectedId),
  )
  const selected = images[selectedIndex]
  const initialIndex = useRef(selectedIndex)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [zoomAttempt, setZoomAttempt] = useState(0)
  const [zoomState, setZoomState] = useState<ZoomState>({
    key: '',
    status: 'pending',
  })
  const selectByOffset = useCallback(
    (offset: number) => {
      if (carouselApi !== undefined) {
        if (offset > 0) {
          carouselApi.scrollNext()
        } else {
          carouselApi.scrollPrev()
        }
        return
      }

      const nextIndex =
        (selectedIndex + offset + images.length) % images.length
      const next = images[nextIndex]
      if (next !== undefined) {
        onSelectImage(next.id)
      }
    },
    [carouselApi, images, onSelectImage, selectedIndex],
  )
  const selectNext = useCallback(
    () => selectByOffset(1),
    [selectByOffset],
  )
  const selectPrevious = useCallback(
    () => selectByOffset(-1),
    [selectByOffset],
  )
  const controls = useViewerControlsVisibility({
    resetKey: selected.id,
  })
  const gestures = useArtworkViewerGestures({
    imageSize: { width: selected.width, height: selected.height },
    resetKey: selected.id,
    onInteraction: controls.revealControls,
  })
  const isZoomedRef = useRef(gestures.isZoomed)
  isZoomedRef.current = gestures.isZoomed
  const watchCarouselDrag = useCallback(
    () => !isZoomedRef.current,
    [],
  )
  const zoomKey = `${selected.id}:${zoomAttempt}`
  const zoomReady =
    zoomState.key === zoomKey && zoomState.status === 'ready'
  const zoomFailed =
    zoomState.key === zoomKey && zoomState.status === 'error'
  const position = formatViewerPosition(
    labels.imagePosition,
    selectedIndex + 1,
    images.length,
  )
  const zoomLevel = formatViewerZoom(labels.zoomLevel, gestures.scale)

  useEffect(() => {
    if (carouselApi === undefined) {
      return
    }

    const syncSelectedImage = () => {
      const next = images[carouselApi.selectedScrollSnap()]
      if (next !== undefined && next.id !== selectedId) {
        onSelectImage(next.id)
      }
    }

    carouselApi.on('select', syncSelectedImage)
    return () => {
      carouselApi.off('select', syncSelectedImage)
    }
  }, [carouselApi, images, onSelectImage, selectedId])

  useEffect(() => {
    if (
      carouselApi !== undefined &&
      carouselApi.selectedScrollSnap() !== selectedIndex
    ) {
      carouselApi.scrollTo(selectedIndex, true)
    }
  }, [carouselApi, selectedIndex])

  useEffect(() => {
    const preloads = neighborIndexes(selectedIndex, images.length).map(
      (index) => {
        const neighbor = images[index]
        const preload = new Image()
        const avifSources = neighbor.detail.sources
          .filter((source) => source.type === 'image/avif')
          .sort((left, right) => left.width - right.width)
        preload.decoding = 'async'
        preload.src = avifSources.at(-1)?.src ?? neighbor.detail.fallback
        return preload
      },
    )

    return () => {
      for (const preload of preloads) {
        preload.removeAttribute('src')
      }
    }
  }, [images, selectedIndex])

  const handleZoomLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget
    void image.decode().catch(() => undefined).then(() => {
      setZoomState({ key: zoomKey, status: 'ready' })
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    controls.keepControlsVisible()
    if (event.defaultPrevented || shouldPreserveBrowserZoom(event)) {
      return
    }

    if (
      event.key === 'ArrowLeft' &&
      images.length > 1
    ) {
      event.preventDefault()
      selectPrevious()
    } else if (event.key === 'ArrowRight' && images.length > 1) {
      event.preventDefault()
      selectNext()
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      gestures.zoomIn()
    } else if (event.key === '-') {
      event.preventDefault()
      gestures.zoomOut()
    } else if (event.key === '0') {
      event.preventDefault()
      gestures.resetZoom()
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className={styles.viewer}
        data-controls-hidden={
          controls.controlsVisible ? undefined : ''
        }
        finalFocus={finalFocus ?? false}
        onKeyDown={handleKeyDown}
        onPointerDownCapture={controls.revealControls}
        onPointerMoveCapture={controls.revealControls}
        onTouchMoveCapture={controls.revealControls}
        onTouchStartCapture={controls.revealControls}
        onWheel={(event) => {
          controls.revealControls()
          gestures.onWheel(event)
        }}
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {selected.alt}. {position}. {zoomLevel}
          </DialogDescription>
        </DialogHeader>

        <div
          aria-label={`${selected.alt}. ${position}. ${zoomLevel}`}
          className={styles.stage}
          data-zoomed={gestures.isZoomed || undefined}
          onDoubleClick={gestures.onDoubleClick}
          onPointerCancel={gestures.onPointerCancel}
          onPointerDown={gestures.onPointerDown}
          onPointerMove={gestures.onPointerMove}
          onPointerUp={gestures.onPointerUp}
          ref={gestures.stageRef}
          role="group"
          tabIndex={0}
        >
          <Carousel
            aria-label={title}
            className={styles.carousel}
            opts={{
              align: 'start',
              dragThreshold: 8,
              duration: 24,
              loop: images.length > 1,
              startIndex: initialIndex.current,
              watchDrag: watchCarouselDrag,
            }}
            setApi={setCarouselApi}
          >
            <CarouselContent className={styles.carouselTrack}>
              {images.map((image, index) => {
                const isSelected = index === selectedIndex

                return (
                  <CarouselItem
                    aria-hidden={isSelected ? undefined : true}
                    aria-label={`${index + 1} / ${images.length}`}
                    className={styles.carouselSlide}
                    key={image.id}
                  >
                    <div
                      className={styles.surface}
                      style={
                        isSelected
                          ? {
                              transform: `translate3d(${gestures.transform.x}px, ${gestures.transform.y}px, 0) scale(${gestures.scale})`,
                            }
                          : undefined
                      }
                    >
                      <ResponsiveImage
                        className={styles.image}
                        draggable={false}
                        image={image}
                        pictureClassName={styles.picture}
                        priority={isSelected}
                        tier="detail"
                      />
                      {isSelected &&
                      gestures.isZoomed &&
                      !zoomFailed ? (
                        <ResponsiveImage
                          aria-hidden="true"
                          className={styles.image}
                          draggable={false}
                          image={image}
                          key={zoomKey}
                          onError={() =>
                            setZoomState({
                              key: zoomKey,
                              status: 'error',
                            })
                          }
                          onLoad={handleZoomLoad}
                          pictureClassName={
                            zoomReady
                              ? `${styles.picture} ${styles.zoomReady}`
                              : `${styles.picture} ${styles.zoomPicture}`
                          }
                          priority
                          tier="zoom"
                        />
                      ) : null}
                    </div>
                  </CarouselItem>
                )
              })}
            </CarouselContent>
          </Carousel>
        </div>

        <Button
          aria-keyshortcuts="Escape"
          aria-label={closeImageLabel}
          className={styles.closeButton}
          onClick={onClose}
          size="icon-lg"
        >
          <XIcon aria-hidden="true" />
        </Button>

        <div aria-live="polite" className="sr-only">
          {position}. {zoomLevel}
        </div>

        {zoomFailed ? (
          <div className={styles.zoomError} role="status">
            <span>{labels.zoomUnavailable}</span>
            <Button
              onClick={() => setZoomAttempt((attempt) => attempt + 1)}
              size="sm"
            >
              {labels.retryZoom}
            </Button>
          </div>
        ) : null}

        <div className={styles.controls}>
          {images.length > 1 ? (
            <div className={styles.controlGroup}>
              <Button
                aria-keyshortcuts="ArrowLeft"
                aria-label={labels.previousImage}
                onClick={selectPrevious}
                size="icon-lg"
              >
                <ChevronLeftIcon aria-hidden="true" />
              </Button>
              <span aria-label={position} className={styles.counter}>
                {selectedIndex + 1} / {images.length}
              </span>
              <Button
                aria-keyshortcuts="ArrowRight"
                aria-label={labels.nextImage}
                onClick={selectNext}
                size="icon-lg"
              >
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </div>
          ) : null}

          {images.length === 1 ? (
            <div className={styles.controlGroup}>
              <Button
                aria-keyshortcuts="-"
                aria-label={labels.zoomOut}
                disabled={gestures.scale <= VIEWER_MIN_SCALE}
                onClick={gestures.zoomOut}
                size="icon-lg"
              >
                <MinusIcon aria-hidden="true" />
              </Button>
              <Button
                aria-keyshortcuts="+ ="
                aria-label={labels.zoomIn}
                disabled={gestures.scale >= VIEWER_MAX_SCALE}
                onClick={gestures.zoomIn}
                size="icon-lg"
              >
                <PlusIcon aria-hidden="true" />
              </Button>
              <Button
                aria-keyshortcuts="0"
                aria-label={labels.resetZoom}
                disabled={!gestures.isZoomed}
                onClick={gestures.resetZoom}
                size="icon-lg"
              >
                <RotateCcwIcon aria-hidden="true" />
              </Button>
            </div>
          ) : onOpenDetails === undefined ? null : (
            <div
              className={`${styles.controlGroup} ${styles.detailsGroup}`}
            >
              <Button
                className={styles.detailsButton}
                onClick={() => onOpenDetails(selected.id)}
                size="touch"
                type="button"
              >
                View details
                <ArrowUpRightIcon
                  aria-hidden="true"
                  data-icon="inline-end"
                />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
