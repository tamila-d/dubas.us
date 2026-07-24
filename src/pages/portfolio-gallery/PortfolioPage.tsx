import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ImagesIcon } from 'lucide-react'
import {
  generatePath,
  Link,
  useLoaderData,
  useLocation,
  useNavigate,
  useRouteLoaderData,
  useSearchParams,
} from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import { APP_ROUTE_IDS, APP_ROUTES } from '@/config/routes'
import type { CardContent } from '@/content/card-types'
import type {
  PortfolioIndexEntry,
  PortfolioIndexResource,
} from '@/content/portfolio-resource'
import { artworkViewerLabels } from '@/features/item-viewer/viewer-contract'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  PortfolioFilterButtons,
  type PortfolioFilterOption,
} from './PortfolioFilterButtons'
import styles from './PortfolioPage.module.css'

const loadPortfolioFilterMenu = () => import('./PortfolioFilterMenu')

const PortfolioFilterMenu = lazy(() =>
  loadPortfolioFilterMenu().then(({ PortfolioFilterMenu }) => ({
    default: PortfolioFilterMenu,
  })),
)

const loadArtworkViewer = () =>
  import('@/features/item-viewer/ArtworkViewer')

const ArtworkViewer = lazy(() =>
  loadArtworkViewer().then(({ ArtworkViewer }) => ({
    default: ArtworkViewer,
  })),
)

const allTypes = 'all'
const initialVisibleCount = 12
const revealCount = 8
const visibleCountByType = new Map<string, number>()
const typeLabels: Record<string, string> = {
  places: 'Places',
  animals: 'Animals',
  portraits: 'Portraits',
  'still-life': 'Still life',
  illustrations: 'Illustrations',
}

function year(createdAt: string): string {
  return createdAt.slice(0, 4)
}

function PortfolioWork({
  item,
  returnTo,
}: {
  item: PortfolioIndexEntry
  returnTo: string
}) {
  return (
    <li className={styles.work}>
      <Link
        className={styles.workLink}
        state={{ portfolioReturnTo: returnTo }}
        to={generatePath(APP_ROUTES.portfolioItem, { id: item.id })}
      >
        <article>
          <div className={styles.media}>
            <ResponsiveImage
              className={styles.image}
              crop={item.crop}
              image={item.image}
              pictureClassName={styles.picture}
              tier="card"
            />
          </div>
          <div className={styles.caption}>
            <h2>{item.title}</h2>
            <p>
              {item.createdAt === null ? null : (
                <>
                  <span>{year(item.createdAt)}</span>
                  <span aria-hidden="true"> · </span>
                </>
              )}
              <span>{item.location}</span>
            </p>
          </div>
        </article>
      </Link>
    </li>
  )
}

export function PortfolioPage() {
  const { items } = useLoaderData() as PortfolioIndexResource
  const { info } = useRouteLoaderData(APP_ROUTE_IDS.shell) as CardContent
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterMenuMounted, setFilterMenuMounted] = useState(false)
  const viewerButtonRef = useRef<HTMLButtonElement>(null)
  const availableTypes = useMemo(
    () => new Set(items.map((item) => item.type)),
    [items],
  )
  const requestedType = searchParams.get('type')
  const selectedType =
    requestedType !== null && availableTypes.has(requestedType)
      ? requestedType
      : allTypes
  const filteredItems = useMemo(
    () =>
      selectedType === allTypes
        ? items
        : items.filter((item) => item.type === selectedType),
    [items, selectedType],
  )
  const [visibleCount, setVisibleCount] = useState(
    () => visibleCountByType.get(selectedType) ?? initialVisibleCount,
  )
  const sentinelRef = useRef<HTMLDivElement>(null)
  const visibleItems = filteredItems.slice(0, visibleCount)
  const hasMore = visibleCount < filteredItems.length
  const viewerImages = useMemo(
    () => items.map((item) => item.image),
    [items],
  )
  const viewerImageIds = useMemo(
    () => new Set(viewerImages.map((image) => image.id)),
    [viewerImages],
  )
  const requestedViewerImage = searchParams.get('image')
  const requestedViewerMode = searchParams.get('view')
  const selectedViewerId =
    requestedViewerImage !== null &&
    viewerImageIds.has(requestedViewerImage)
      ? requestedViewerImage
      : viewerImages[0]?.id
  const viewerOpen =
    requestedViewerMode === 'all' &&
    selectedViewerId !== undefined
  const selectedViewerImage = viewerImages.find(
    (image) => image.id === selectedViewerId,
  )
  const displayName = `${info.artist.firstName} ${info.artist.lastName}`
  const returnTo = `${location.pathname}${location.search}`

  useDocumentTitle(`Portfolio — ${displayName}`)

  useEffect(() => {
    if (requestedType !== null && !availableTypes.has(requestedType)) {
      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.delete('type')
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [
    availableTypes,
    requestedType,
    searchParams,
    setSearchParams,
  ])

  useEffect(() => {
    const needsSelectedImage =
      requestedViewerMode === 'all' &&
      selectedViewerId !== undefined &&
      requestedViewerImage !== selectedViewerId
    const hasInvalidViewerQuery =
      (requestedViewerMode !== null &&
        requestedViewerMode !== 'all') ||
      (requestedViewerMode !== 'all' &&
        requestedViewerImage !== null) ||
      (requestedViewerMode === 'all' &&
        selectedViewerId === undefined)

    if (!needsSelectedImage && !hasInvalidViewerQuery) return

    const nextSearchParams = new URLSearchParams(searchParams)
    if (needsSelectedImage) {
      nextSearchParams.set('image', selectedViewerId)
    } else {
      nextSearchParams.delete('view')
      nextSearchParams.delete('image')
    }
    setSearchParams(nextSearchParams, {
      preventScrollReset: true,
      replace: true,
      state: location.state,
    })
  }, [
    location.state,
    requestedViewerImage,
    requestedViewerMode,
    searchParams,
    selectedViewerId,
    setSearchParams,
  ])

  useEffect(() => {
    setVisibleCount(
      visibleCountByType.get(selectedType) ?? initialVisibleCount,
    )
  }, [selectedType])

  useEffect(() => {
    visibleCountByType.set(selectedType, visibleCount)
  }, [selectedType, visibleCount])

  const revealMore = useCallback(() => {
    setVisibleCount((count) =>
      Math.min(count + revealCount, filteredItems.length),
    )
  }, [filteredItems.length])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (sentinel === null || !hasMore || !('IntersectionObserver' in window)) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          revealMore()
        }
      },
      { rootMargin: '720px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, revealMore])

  const selectType = (values: string[]) => {
    const nextType = values.at(-1) ?? allTypes
    const nextSearchParams = new URLSearchParams(searchParams)
    if (nextType === allTypes) {
      nextSearchParams.delete('type')
      setSearchParams(nextSearchParams)
      return
    }
    nextSearchParams.set('type', nextType)
    setSearchParams(nextSearchParams)
  }

  const openViewer = () => {
    const firstImage = viewerImages[0]
    if (firstImage === undefined) return

    void loadArtworkViewer().then(() => {
      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.set('view', 'all')
      nextSearchParams.set('image', firstImage.id)
      setSearchParams(nextSearchParams, {
        preventScrollReset: true,
        state: { portfolioViewerOpened: true },
      })
    })
  }

  const closeViewer = () => {
    const openedFromPortfolio =
      typeof location.state === 'object' &&
      location.state !== null &&
      'portfolioViewerOpened' in location.state &&
      location.state.portfolioViewerOpened === true

    if (openedFromPortfolio) {
      void navigate(-1)
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('view')
    nextSearchParams.delete('image')
    setSearchParams(nextSearchParams, {
      preventScrollReset: true,
      replace: true,
    })
  }

  const selectViewerImage = (imageId: string) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('view', 'all')
    nextSearchParams.set('image', imageId)
    setSearchParams(nextSearchParams, {
      preventScrollReset: true,
      replace: true,
      state: location.state,
    })
  }

  const openViewerImageDetails = (imageId: string) => {
    void navigate(
      generatePath(APP_ROUTES.portfolioItem, { id: imageId }),
      {
        state: { portfolioReturnTo: returnTo },
      },
    )
  }

  const types = Object.keys(typeLabels).filter((type) =>
    availableTypes.has(type),
  )
  const filterOptions: PortfolioFilterOption[] = [
    { label: 'All', value: allTypes },
    ...types.map((type) => ({
      label: typeLabels[type],
      value: type,
    })),
  ]
  const selectedFilterLabel =
    filterOptions.find((option) => option.value === selectedType)
      ?.label ?? 'All'

  return (
    <section className={styles.page} aria-labelledby="portfolio-title">
      <div className={styles.shell}>
        <header className={styles.intro}>
          <h1 id="portfolio-title">Portfolio</h1>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.filterMenu}>
            {filterMenuMounted ? (
              <Suspense
                fallback={
                  <PortfolioFilterButtons
                    label={selectedFilterLabel}
                    onOpen={() => undefined}
                  />
                }
              >
                <PortfolioFilterMenu
                  initialOpen
                  label={selectedFilterLabel}
                  onValueChange={(value) => {
                    selectType([value])
                  }}
                  options={filterOptions}
                  value={selectedType}
                />
              </Suspense>
            ) : (
              <PortfolioFilterButtons
                label={selectedFilterLabel}
                onIntent={() => {
                  void loadPortfolioFilterMenu()
                }}
                onOpen={() => {
                  void loadPortfolioFilterMenu().then(() => {
                    setFilterMenuMounted(true)
                  })
                }}
              />
            )}
          </div>

          <div className={styles.filterTabs}>
            <ToggleGroup
              aria-label="Filter portfolio by type"
              onValueChange={selectType}
              size="lg"
              value={[selectedType]}
              variant="primary"
            >
              {filterOptions.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Button
            className={styles.viewerButton}
            onClick={openViewer}
            onFocus={() => void loadArtworkViewer()}
            onPointerDown={() => void loadArtworkViewer()}
            onPointerEnter={() => void loadArtworkViewer()}
            ref={viewerButtonRef}
            size="touch"
            type="button"
          >
            <ImagesIcon aria-hidden="true" data-icon="inline-start" />
            View all
          </Button>
        </div>

        {filteredItems.length === 0 ? (
          <Empty className={styles.empty}>
            <EmptyHeader>
              <EmptyTitle>No works in this collection yet</EmptyTitle>
              <EmptyDescription>
                Choose another category to continue browsing.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <ul className={styles.grid}>
              {visibleItems.map((item) => (
                <PortfolioWork
                  item={item}
                  key={item.id}
                  returnTo={returnTo}
                />
              ))}
            </ul>

            {hasMore ? (
              <div className={styles.more} ref={sentinelRef}>
                <Button onClick={revealMore} size="touch">
                  Load more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {viewerOpen && selectedViewerImage !== undefined ? (
        <Suspense fallback={null}>
          <ArtworkViewer
            closeImageLabel="Close portfolio viewer"
            finalFocus={viewerButtonRef}
            images={viewerImages}
            labels={artworkViewerLabels}
            onClose={closeViewer}
            onOpenDetails={openViewerImageDetails}
            onSelectImage={selectViewerImage}
            selectedId={selectedViewerId}
            title="Portfolio viewer"
          />
        </Suspense>
      ) : null}
    </section>
  )
}
