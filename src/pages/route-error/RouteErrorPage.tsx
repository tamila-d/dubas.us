import { Link, useRouteError } from 'react-router-dom'
import { CircleAlertIcon } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { AppBootReady } from '@/components/loading/AppBootReady'
import {
  usePageMetadata,
  type PageMetadata,
} from '@/hooks/usePageMetadata'
import styles from './RouteErrorPage.module.css'

const emergencySeo: PageMetadata = {
  title: 'Unable to open the page',
  description: 'The requested page could not be loaded.',
  robots: 'noindex,nofollow',
}

export function RouteErrorPage() {
  useRouteError()
  const title = 'The page could not be opened'
  const description = 'Try again, or return to the home page.'
  const action = { label: 'Return home', href: '/' }
  usePageMetadata(emergencySeo)

  return (
    <>
      <main className={styles.page}>
        <Alert className={styles.alert}>
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>
            <h1>{title}</h1>
          </AlertTitle>
          <AlertDescription>
            <p>{description}</p>
            <Link
              className={buttonVariants({ variant: 'outline' })}
              to={action.href}
            >
              {action.label}
            </Link>
          </AlertDescription>
        </Alert>
      </main>
      <AppBootReady />
    </>
  )
}
