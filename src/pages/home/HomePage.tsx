import { Link, useRouteLoaderData } from 'react-router-dom'
import {
  FrameIcon,
  PaintbrushIcon,
  PaletteIcon,
  UserRoundIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { BotanicalSprigIcon } from '@/components/icons/BotanicalSprigIcon'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import {
  responsiveImageFallbackProps,
  responsiveImageSourceProps,
} from '@/components/media/ResponsiveImage'
import { APP_ROUTE_IDS, APP_ROUTES } from '@/config/routes'
import type { CardContent } from '@/content/card-types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import styles from './HomePage.module.css'

const profileLinkClassName = buttonVariants({
  size: 'profile',
  variant: 'profile',
})

const portraitSizes = '(max-width: 640px) 144px, 168px'
const linksAriaLabel = 'Artist links'
const pageLinks = [
  {
    id: 'portfolio',
    icon: PaletteIcon,
    label: 'Original Art',
    href: APP_ROUTES.portfolio,
    unavailableMessage: null,
  },
  {
    id: 'store',
    icon: FrameIcon,
    label: 'Fine Art Prints',
    href: APP_ROUTES.store,
    unavailableMessage:
      'Fine art prints with size selection and Venmo checkout are coming soon.',
  },
  {
    id: 'commissions',
    icon: PaintbrushIcon,
    label: 'Commissions',
    href: APP_ROUTES.commissions,
    unavailableMessage:
      'Commission details and pricing are coming soon.',
  },
  {
    id: 'about',
    icon: UserRoundIcon,
    label: 'About Me',
    href: APP_ROUTES.about,
    unavailableMessage: null,
  },
] as const

export function HomePage() {
  const {
    info,
    portrait,
    signature,
  } = useRouteLoaderData(
    APP_ROUTE_IDS.shell,
  ) as CardContent
  const displayName =
    `${info.artist.firstName} ${info.artist.lastName}`
  const documentRole = info.artist.role.replace(
    /\b[a-z]/g,
    (letter) => letter.toLocaleUpperCase(info.locale),
  )
  const initials =
    `${info.artist.firstName[0] ?? ''}${info.artist.lastName[0] ?? ''}`
  useDocumentTitle(`${displayName} — ${documentRole}`)

  return (
    <section className={styles.page} aria-labelledby="artist-name">
      <div className={styles.profileCard}>
        <div className={styles.hero}>
          <Avatar className={styles.portrait}>
            <picture className="contents">
              <source
                type="image/webp"
                {...responsiveImageSourceProps(
                  portrait,
                  'card',
                  'image/webp',
                )}
                sizes={portraitSizes}
              />
              <AvatarImage
                className={styles.portraitImage}
                {...responsiveImageFallbackProps(portrait, 'card')}
                alt={portrait.alt}
                fetchPriority="high"
                loading="eager"
                sizes={portraitSizes}
              />
            </picture>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </div>

        <header className={styles.identity}>
          <h1 id="artist-name">
            <span className="sr-only">{displayName}</span>
            <img
              alt=""
              aria-hidden="true"
              className={styles.signature}
              decoding="async"
              fetchPriority="high"
              height={signature.height}
              loading="eager"
              src={signature.original.url}
              width={signature.width}
            />
          </h1>
        </header>

        <div className={styles.roleSection}>
          <p>{info.artist.role}</p>
          <div className={styles.branchDivider} aria-hidden="true">
            <span />
            <BotanicalSprigIcon />
            <span />
          </div>
        </div>

        <nav className={styles.links} aria-label={linksAriaLabel}>
          <ul className={styles.linkList}>
            {pageLinks.map((link) => (
              <li className={styles.linkItem} key={link.id}>
                {link.unavailableMessage !== null ? (
                  <a
                    aria-disabled="true"
                    className={cn(
                      profileLinkClassName,
                      styles.profileLink,
                    )}
                    href={link.href}
                    onClick={(event) => {
                      event.preventDefault()
                      toast.info(link.unavailableMessage)
                    }}
                  >
                    <link.icon
                      aria-hidden="true"
                      data-icon="inline-start"
                    />
                    {link.label}
                  </a>
                ) : (
                  <Link
                    className={cn(
                      profileLinkClassName,
                      styles.profileLink,
                    )}
                    to={link.href}
                  >
                    <link.icon
                      aria-hidden="true"
                      data-icon="inline-start"
                    />
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <footer className={styles.footer}>
          <a
            aria-label={`Open ${info.artist.handle} on Instagram`}
            className={styles.handle}
            href={info.links.instagram}
            rel="noreferrer"
            target="_blank"
          >
            {info.artist.handle}
          </a>
        </footer>
      </div>
    </section>
  )
}
