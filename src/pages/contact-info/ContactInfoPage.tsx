import { useState } from 'react'
import {
  ContactRoundIcon,
  MailIcon,
  PhoneIcon,
} from 'lucide-react'
import { useRouteLoaderData } from 'react-router-dom'
import { toast } from 'sonner'
import { InstagramIcon } from '@/components/icons/InstagramIcon'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  responsiveImageFallbackProps,
  responsiveImageSourceProps,
} from '@/components/media/ResponsiveImage'
import { APP_ROUTE_IDS } from '@/config/routes'
import type { CardContent as CardPageContent } from '@/content/card-types'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'
import { downloadContact } from './contact-download'
import styles from './ContactInfoPage.module.css'

const contactLinkClassName = buttonVariants({
  size: 'touch',
  variant: 'outline',
})
const portraitSizes = '(max-width: 899px) 64px, 80px'
const downloadErrorMessage =
  'The contact could not be prepared. Please try again.'

function titleCase(value: string, locale: string): string {
  return value.replace(
    /\b[a-z]/g,
    (letter) => letter.toLocaleUpperCase(locale),
  )
}

function telephoneHref(phone: string): string {
  return `tel:${phone.replaceAll(/[^\d+]/g, '')}`
}

export function ContactInfoPage() {
  const {
    info,
    portrait,
  } = useRouteLoaderData(
    APP_ROUTE_IDS.shell,
  ) as CardPageContent
  const [downloading, setDownloading] = useState(false)
  const displayName =
    `${info.artist.firstName} ${info.artist.lastName}`
  const role = titleCase(info.artist.role, info.locale)
  const initials =
    `${info.artist.firstName[0] ?? ''}${info.artist.lastName[0] ?? ''}`
  const contactPhoto = portrait.detail.sources.find(
    (source) => source.type === 'image/jpeg' && source.width === 320,
  )

  useDocumentTitle(`Contact ${displayName}`)

  const handleDownload = async () => {
    if (downloading) return
    if (contactPhoto === undefined) {
      toast.error(downloadErrorMessage)
      return
    }

    setDownloading(true)
    try {
      await downloadContact(
        {
          email: info.contact.email,
          firstName: info.artist.firstName,
          instagramUrl: info.links.instagram,
          lastName: info.artist.lastName,
          organization: `${displayName} Art`,
          phone: info.contact.phone,
          role,
          websiteUrl: info.links.website,
        },
        contactPhoto.src,
      )
    } catch {
      toast.error(downloadErrorMessage)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className={styles.page} aria-labelledby="contact-title">
      <div className={styles.shell}>
        <header className={styles.hero}>
          <h1 id="contact-title">Contact</h1>
          <p>For artwork, commissions, and collaborations.</p>
        </header>

        <div className={styles.cardGrid}>
          <Card className={styles.detailsCard}>
            <CardHeader>
              <CardTitle>Contact details</CardTitle>
              <CardDescription>
                Choose the most convenient way to get in touch.
              </CardDescription>
            </CardHeader>
            <CardContent className={styles.contactList}>
              <a
                className={cn(contactLinkClassName, styles.contactLink)}
                href={`mailto:${info.contact.email}`}
              >
                <MailIcon data-icon="inline-start" />
                {info.contact.email}
              </a>
              <Separator />
              <a
                className={cn(contactLinkClassName, styles.contactLink)}
                href={telephoneHref(info.contact.phone)}
              >
                <PhoneIcon data-icon="inline-start" />
                {info.contact.phone}
              </a>
              <Separator />
              <a
                className={cn(contactLinkClassName, styles.contactLink)}
                href={info.links.instagram}
                rel="noreferrer"
                target="_blank"
              >
                <InstagramIcon data-icon="inline-start" />
                {info.artist.handle}
              </a>
            </CardContent>
          </Card>

          <Card className={styles.saveCard}>
            <CardHeader className={styles.profileHeader}>
              <Avatar className={styles.avatar}>
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
                    {...responsiveImageFallbackProps(portrait, 'card')}
                    alt={portrait.alt}
                    className={styles.avatarImage}
                    loading="lazy"
                    sizes={portraitSizes}
                  />
                </picture>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className={styles.profileCopy}>
                <CardTitle>{displayName}</CardTitle>
                <CardDescription>{role}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className={styles.saveDescription}>
                Keep my details close, and feel free to reach out about
                original artwork, commissions, or a creative collaboration.
                I’d love to hear from you.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                aria-busy={downloading || undefined}
                className={styles.downloadButton}
                disabled={downloading}
                onClick={handleDownload}
                size="touch"
              >
                {downloading ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <ContactRoundIcon data-icon="inline-start" />
                )}
                {downloading ? 'Preparing contact…' : 'Add to contacts'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  )
}
