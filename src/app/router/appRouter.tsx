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
import { portfolioClient } from '@/content/clients/PortfolioClient'
import {
  lazyComponent,
  loadLazyModule,
} from '@/lib/loadLazyModule'
import { browserEntryRoute } from './entryRoute'

const HomePage = lazyComponent(
  () => import('@/pages/home/HomePage'),
  ({ HomePage }) => HomePage,
)
const ContactInfoPage = lazyComponent(
  () => import('@/pages/contact-info/ContactInfoPage'),
  ({ ContactInfoPage }) => ContactInfoPage,
)
const PortfolioPage = lazyComponent(
  () => import('@/pages/portfolio-gallery/PortfolioPage'),
  ({ PortfolioPage }) => PortfolioPage,
)
const PortfolioItemPage = lazyComponent(
  () => import('@/pages/portfolio-item/PortfolioItemPage'),
  ({ PortfolioItemPage }) => PortfolioItemPage,
)

const infoClient = new InfoClient()

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

function aboutRedirectLoader() {
  throw redirect(APP_ROUTES.about)
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

async function portfolioLoader({ request }: LoaderFunctionArgs) {
  const catalog = await portfolioClient.getCatalog({
    signal: request.signal,
  })

  return { catalog }
}

function portfolioItemLoader({ params }: LoaderFunctionArgs) {
  if (params.id === undefined) {
    throw new Response('Portfolio item id is required', { status: 404 })
  }

  return { id: params.id }
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
      const { CropGalleryPage } = await loadLazyModule(
        () => import('@/pages/crop/CropGalleryPage'),
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
      const { CropPage } = await loadLazyModule(
        () => import('@/pages/crop/CropPage'),
      )

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
        path: APP_ROUTES.about,
        element: <ContactInfoPage />,
      },
      {
        path: APP_ROUTES.contact,
        loader: aboutRedirectLoader,
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
