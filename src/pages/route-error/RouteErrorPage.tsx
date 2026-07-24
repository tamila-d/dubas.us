import {
  isRouteErrorResponse,
  Link,
  useRouteError,
} from 'react-router-dom'
import {
  ArrowRightIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { AppBootReady } from '@/components/loading/AppBootReady'
import { SiteHeader } from '@/components/site-header/SiteHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { APP_ROUTES } from '@/config/routes'
import { ContentRequestError } from '@/content/http'
import {
  usePageMetadata,
  type PageMetadata,
} from '@/hooks/usePageMetadata'
import styles from './RouteErrorPage.module.css'

const artistName = 'Tamila Dubas'
const notFoundSeo: PageMetadata = {
  title: `Page not found — ${artistName}`,
  description: 'The requested artwork or page could not be found.',
  robots: 'noindex,nofollow',
}
const errorSeo: PageMetadata = {
  title: `Unable to open the page — ${artistName}`,
  description: 'The requested page could not be loaded.',
  robots: 'noindex,nofollow',
}

function pageWasNotFound(error: unknown): boolean {
  return isRouteErrorResponse(error)
    ? error.status === 404
    : error instanceof ContentRequestError &&
        error.code === 'not-found'
}

export function RouteErrorPage() {
  const error = useRouteError()
  const notFound = pageWasNotFound(error)
  const title = notFound
    ? 'This page is out of frame.'
    : 'This page needs another moment.'
  const description = notFound
    ? 'The artwork or page may have moved, or the link may be incomplete. Continue exploring in the portfolio.'
    : 'Something interrupted the page while it was opening. Try again, or continue with the portfolio.'
  usePageMetadata(notFound ? notFoundSeo : errorSeo)

  return (
    <>
      <SiteHeader artistName={artistName} />
      <main className={styles.page}>
        <Card className={styles.card}>
          <div aria-hidden="true" className={styles.visual}>
            <div className={styles.frame}>
              <span>{notFound ? '404' : '…'}</span>
            </div>
          </div>

          <Empty className={styles.copy}>
            <EmptyHeader className={styles.header}>
              <p className={styles.eyebrow}>
                {notFound ? 'Page not found' : 'Unable to open'}
              </p>
              <EmptyTitle className={styles.title}>
                <h1>{title}</h1>
              </EmptyTitle>
              <EmptyDescription className={styles.description}>
                <p>{description}</p>
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className={styles.actions}>
              {notFound ? null : (
                <Button
                  onClick={() => window.location.reload()}
                  size="touch"
                  type="button"
                >
                  <RotateCcwIcon data-icon="inline-start" />
                  Try again
                </Button>
              )}
              <Link
                className={buttonVariants({
                  size: 'touch',
                  variant: notFound ? 'default' : 'outline',
                })}
                to={APP_ROUTES.portfolio}
              >
                Browse portfolio
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </EmptyContent>
          </Empty>
        </Card>
      </main>
      <AppBootReady />
    </>
  )
}
