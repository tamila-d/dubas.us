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
import { InfoClient } from '@/content/clients/InfoClient'
import { PortfolioClient } from '@/content/clients/PortfolioClient'
import { browserEntryRoute } from './entryRoute'

const HomePage = lazy(() =>
  import('@/pages/home/HomePage').then(({ HomePage }) => ({ default: HomePage })),
)
const ContactInfoPage = lazy(() =>
  import('@/pages/contact-info/ContactInfoPage').then(
    ({ ContactInfoPage }) => ({ default: ContactInfoPage }),
  ),
)
const PortfolioPage = lazy(() =>
  import('@/pages/portfolio-gallery/PortfolioPage').then(
    ({ PortfolioPage }) => ({ default: PortfolioPage }),
  ),
)
const PortfolioItemPage = lazy(() =>
  import('@/pages/portfolio-item/PortfolioItemPage').then(
    ({ PortfolioItemPage }) => ({ default: PortfolioItemPage }),
  ),
)

const infoClient = new InfoClient()
const portfolioClient = new PortfolioClient()

function cropCatalogLoader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url)

  if (
    requestUrl.pathname !== APP_ROUTES.crop ||
    requestUrl.search !== ''
  ) {
    throw redirect(`${APP_ROUTES.crop}${requestUrl.hash}`)
  }

  return portfolioClient.getIndex({ signal: request.signal })
}

function cropItemLoader({ params, request }: LoaderFunctionArgs) {
  if (params.id === undefined) {
    throw new Response('Portfolio item id is required', { status: 404 })
  }

  const requestUrl = new URL(request.url)
  const pathname =
    `${APP_ROUTES.crop}/${encodeURIComponent(params.id)}`

  if (
    requestUrl.pathname !== pathname ||
    requestUrl.search !== ''
  ) {
    throw redirect(`${pathname}${requestUrl.hash}`)
  }

  return portfolioClient.getDetail(params.id, {
    signal: request.signal,
  })
}

function cardRedirectLoader() {
  throw redirect(APP_ROUTES.card)
}

function canonicalPathname(pathname: string): string {
  return pathname === '/' ? pathname : pathname.replace(/\/+$/, '')
}

async function appShellLoader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url)
  const pathname = canonicalPathname(requestUrl.pathname)
  const searchIsAllowed = pathname === APP_ROUTES.portfolio
  const isPortfolioPath =
    pathname === APP_ROUTES.portfolio ||
    pathname.startsWith(`${APP_ROUTES.portfolio}/`)

  if (pathname === APP_ROUTES.home) {
    throw redirect(browserEntryRoute())
  }

  if (
    pathname !== requestUrl.pathname ||
    (!searchIsAllowed && requestUrl.search !== '')
  ) {
    throw redirect(
      `${pathname}${searchIsAllowed ? requestUrl.search : ''}${requestUrl.hash}`,
    )
  }

  if (isPortfolioPath) {
    return {
      info: await infoClient.get({ signal: request.signal }),
    }
  }

  return loadCardContent({ signal: request.signal })
}

function portfolioLoader({ request }: LoaderFunctionArgs) {
  return portfolioClient.getIndex({ signal: request.signal })
}

function portfolioItemLoader({ params, request }: LoaderFunctionArgs) {
  if (params.id === undefined) {
    throw new Response('Portfolio item id is required', { status: 404 })
  }

  return portfolioClient.getDetail(params.id, {
    signal: request.signal,
  })
}

function revalidateWhenPathChanges({
  currentUrl,
  nextUrl,
}: ShouldRevalidateFunctionArgs): boolean {
  return currentUrl.pathname !== nextUrl.pathname
}

export const appRouter = createBrowserRouter([
  {
    path: APP_ROUTES.crop,
    errorElement: <RouteErrorPage />,
    loader: cropCatalogLoader,
    lazy: async () => {
      const { CropGalleryPage } = await import(
        '@/pages/crop/CropGalleryPage'
      )

      return {
        Component: CropGalleryPage,
      }
    },
  },
  {
    path: APP_ROUTES.cropItem,
    errorElement: <RouteErrorPage />,
    loader: cropItemLoader,
    lazy: async () => {
      const { CropPage } = await import('@/pages/crop/CropPage')

      return {
        Component: CropPage,
      }
    },
  },
  {
    id: APP_ROUTE_IDS.shell,
    path: APP_ROUTES.home,
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    loader: appShellLoader,
    shouldRevalidate: revalidateWhenPathChanges,
    children: [
      {
        path: APP_ROUTES.card,
        element: <HomePage />,
      },
      {
        path: APP_ROUTES.contact,
        element: <ContactInfoPage />,
      },
      {
        path: APP_ROUTES.portfolio,
        element: <PortfolioPage />,
        loader: portfolioLoader,
        shouldRevalidate: revalidateWhenPathChanges,
      },
      {
        path: APP_ROUTES.portfolioItem,
        element: <PortfolioItemPage />,
        loader: portfolioItemLoader,
        shouldRevalidate: revalidateWhenPathChanges,
      },
      { path: APP_ROUTES.notFound, loader: cardRedirectLoader },
    ],
  },
])
