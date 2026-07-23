import { lazy } from 'react'
import {
  createBrowserRouter,
  redirect,
  type LoaderFunctionArgs,
  type ShouldRevalidateFunctionArgs,
} from 'react-router-dom'
import { AppLayout } from '@/app/layouts/AppLayout'
import { RouteErrorPage } from '@/pages/route-error/RouteErrorPage'
import { APP_ROUTE_IDS, APP_ROUTES } from '@/config/routes'
import { loadCardContent } from '@/content/card-loader'

const HomePage = lazy(() =>
  import('@/pages/home/HomePage').then(({ HomePage }) => ({ default: HomePage })),
)

function cardRedirectLoader() {
  throw redirect(APP_ROUTES.card)
}

function canonicalPathname(pathname: string): string {
  return pathname === '/' ? pathname : pathname.replace(/\/+$/, '')
}

async function appShellLoader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url)
  const pathname = canonicalPathname(requestUrl.pathname)

  if (pathname !== requestUrl.pathname || requestUrl.search !== '') {
    throw redirect(`${pathname}${requestUrl.hash}`)
  }

  return loadCardContent({ signal: request.signal })
}

function revalidateWhenPathChanges({
  currentUrl,
  defaultShouldRevalidate,
  nextUrl,
}: ShouldRevalidateFunctionArgs): boolean {
  return currentUrl.pathname === nextUrl.pathname
    ? false
    : defaultShouldRevalidate
}

export const appRouter = createBrowserRouter([
  {
    id: APP_ROUTE_IDS.shell,
    path: APP_ROUTES.home,
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    loader: appShellLoader,
    shouldRevalidate: revalidateWhenPathChanges,
    children: [
      { index: true, loader: cardRedirectLoader },
      {
        path: APP_ROUTES.card,
        element: <HomePage />,
      },
      { path: APP_ROUTES.notFound, loader: cardRedirectLoader },
    ],
  },
])
