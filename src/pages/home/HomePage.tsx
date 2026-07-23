import { useRouteLoaderData } from 'react-router-dom'
import { toast } from 'sonner'
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
import styles from './HomePage.module.css'

const profileLinkClassName = buttonVariants({
  size: 'profile',
  variant: 'profile',
})

const portraitSizes = '(max-width: 640px) 140px, 192px'
const linksAriaLabel = 'Artist links'
const unavailableMessage = 'This section is under development.'
const unavailableLinks = [
  {
    id: 'portfolio',
    label: 'Portfolio',
    href: APP_ROUTES.portfolio,
    unavailable: true,
  },
  {
    id: 'store',
    label: 'Store',
    href: APP_ROUTES.store,
    unavailable: true,
  },
  {
    id: 'contact',
    label: 'Contact Me',
    href: APP_ROUTES.contact,
    unavailable: true,
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
  const links = [
    {
      id: 'instagram',
      label: 'Instagram',
      href: info.links.instagram,
      unavailable: false,
    },
    ...unavailableLinks,
  ] as const

  useDocumentTitle(`${displayName} — ${documentRole}`)

  return (
    <section className={styles.page} aria-labelledby="artist-name">
      <div className={styles.profileCard}>
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
          <p>{info.artist.role}</p>
        </header>

        <nav className={styles.links} aria-label={linksAriaLabel}>
          <ul className={styles.linkList}>
            {links.map((link) => (
              <li className={styles.linkItem} key={link.id}>
                {link.unavailable ? (
                  <a
                    aria-disabled="true"
                    className={profileLinkClassName}
                    href={link.href}
                    onClick={(event) => {
                      event.preventDefault()
                      toast.info(unavailableMessage)
                    }}
                  >
                    {link.label}
                  </a>
                ) : (
                  <a
                    className={profileLinkClassName}
                    href={link.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <p className={styles.handle}>{info.artist.handle}</p>
      </div>
    </section>
  )
}
