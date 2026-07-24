import { Suspense, useEffect } from 'react'
import {
  Outlet,
  ScrollRestoration,
  useLoaderData,
  useLocation,
  useMatch,
  useNavigation,
} from 'react-router-dom'
import { AppBootReady } from '@/components/loading/AppBootReady'
import {
  CatalogPageSkeleton,
  ItemDetailSkeleton,
} from '@/components/loading/ContentSkeletons'
import { PageLoader } from '@/components/page-loader/PageLoader'
import { SiteHeader } from '@/components/site-header/SiteHeader'
import { APP_ROUTES } from '@/config/routes'
import type { CardContent } from '@/content/card-types'
import { cn } from '@/lib/utils'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { info } = useLoaderData() as CardContent
  const { pathname } = useLocation()
  const navigation = useNavigation()
  const mainContentId = 'main-content'
  const loadingContent = <PageLoader label="Loading page…" />
  const profilePage = pathname === APP_ROUTES.card
  const portfolioItemPage =
    useMatch(APP_ROUTES.portfolioItem) !== null
  const pendingPortfolio =
    navigation.state !== 'idle' &&
    navigation.location?.pathname === APP_ROUTES.portfolio
  const pendingPortfolioItem =
    navigation.state !== 'idle' &&
    navigation.location?.pathname.startsWith(
      `${APP_ROUTES.portfolio}/`,
    )
  const displayName = `${info.artist.firstName} ${info.artist.lastName}`

  useEffect(() => {
    document.documentElement.lang = info.locale
    document.documentElement.dataset.pageSurface =
      profilePage ? 'profile' : 'content'
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', profilePage ? '#f5f5f5' : '#ffffff')
  }, [info.locale, profilePage])

  return (
    <div className={cn(styles.app, profilePage && styles.profileApp)}>
      {profilePage ? null : (
        <SiteHeader
          artistName={displayName}
          showPortfolioBack={portfolioItemPage}
        />
      )}
      <main
        className={cn(styles.main, profilePage && styles.profileMain)}
        id={mainContentId}
      >
        {pendingPortfolio ? (
          <CatalogPageSkeleton label="Loading portfolio…" />
        ) : pendingPortfolioItem ? (
          <ItemDetailSkeleton label="Loading artwork…" />
        ) : (
          <Suspense fallback={loadingContent}>
            <Outlet />
            <AppBootReady />
          </Suspense>
        )}
      </main>
      <ScrollRestoration />
    </div>
  )
}
