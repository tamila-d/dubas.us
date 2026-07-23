import { Suspense, useEffect } from 'react'
import { Outlet, useLoaderData } from 'react-router-dom'
import { AppBootReady } from '@/components/loading/AppBootReady'
import { PageLoader } from '@/components/page-loader/PageLoader'
import type { CardContent } from '@/content/card-types'
import { cn } from '@/lib/utils'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { info } = useLoaderData() as CardContent
  const mainContentId = 'main-content'
  const loadingContent = <PageLoader label="Loading page…" />

  useEffect(() => {
    document.documentElement.lang = info.locale
    document.documentElement.dataset.pageSurface = 'profile'
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', '#f5f5f5')
  }, [info.locale])

  return (
    <div className={styles.app}>
      <main
        className={cn(styles.main, styles.profileMain)}
        id={mainContentId}
      >
        <Suspense fallback={loadingContent}>
          <Outlet />
          <AppBootReady />
        </Suspense>
      </main>
    </div>
  )
}
