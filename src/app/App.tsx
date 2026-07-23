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
  const isProfilePath =
    pathname === APP_ROUTES.home ||
    pathname === APP_ROUTES.card ||
    pathname === `${APP_ROUTES.card}/`

  return (
    <>
      {initialized ? (
        <RouterProvider router={appRouter} />
      ) : (
        <AppBootstrapSkeleton
          label="Loading page…"
          profile={isProfilePath}
        />
      )}
      <Toaster position="top-center" />
    </>
  )
}
