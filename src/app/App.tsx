import { useSyncExternalStore } from 'react'
import { RouterProvider } from 'react-router-dom'
import { appRouter } from '@/app/router/appRouter'
import { AppBootstrapSkeleton } from '@/components/loading/ContentSkeletons'
import { Toaster } from '@/components/ui/sonner'
import { APP_ROUTES } from '@/config/routes'

export function App() {
  const initialized = useSyncExternalStore(
    appRouter.subscribe,
    () => appRouter.state.initialized,
    () => appRouter.state.initialized,
  )
  const pathname = window.location.pathname
  const isCropPath =
    pathname === APP_ROUTES.crop ||
    pathname.startsWith(`${APP_ROUTES.crop}/`)
  const isProfilePath =
    pathname === APP_ROUTES.home ||
    pathname === APP_ROUTES.card ||
    pathname === `${APP_ROUTES.card}/`
  const isPortfolioPath =
    pathname === APP_ROUTES.portfolio ||
    pathname === `${APP_ROUTES.portfolio}/`
  const isPortfolioItemPath =
    pathname.startsWith(`${APP_ROUTES.portfolio}/`) &&
    pathname !== `${APP_ROUTES.portfolio}/`

  return (
    <>
      {initialized ? (
        <RouterProvider router={appRouter} />
      ) : (
        <AppBootstrapSkeleton
          catalog={isPortfolioPath}
          crop={isCropPath}
          detail={isPortfolioItemPath}
          label="Loading page…"
          profile={isProfilePath}
        />
      )}
      <Toaster position="top-center" />
    </>
  )
}
