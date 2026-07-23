import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import styles from './ContentSkeletons.module.css'

interface SkeletonStatusProps {
  label: string
}

function Status({
  label,
  children,
  className,
}: SkeletonStatusProps & { children: ReactNode; className?: string }) {
  return (
    <div
      aria-busy="true"
      className={className ?? styles.status}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  )
}

function IntroSkeleton() {
  return (
    <div className={styles.intro}>
      <Skeleton className={styles.eyebrow} />
      <Skeleton className={styles.title} />
      <Skeleton className={styles.copy} />
      <Skeleton className={styles.copyShort} />
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className={styles.card}>
      <Skeleton className={styles.media} />
      <Skeleton className={styles.cardLine} />
      <Skeleton className={styles.cardMeta} />
    </div>
  )
}

export function PageSkeleton({ label }: SkeletonStatusProps) {
  return (
    <Status label={label}>
      <div className={styles.page}>
        <IntroSkeleton />
        <div className={styles.readingSections}>
          {Array.from({ length: 3 }, (_, index) => (
            <div className={styles.readingSection} key={index}>
              <Skeleton className={styles.sectionTitle} />
              <Skeleton className={styles.copy} />
              <Skeleton className={styles.copyShort} />
            </div>
          ))}
        </div>
      </div>
    </Status>
  )
}

export function CatalogPageSkeleton({ label }: SkeletonStatusProps) {
  return (
    <Status label={label}>
      <div className={styles.page}>
        <IntroSkeleton />
        <div className={styles.filterSkeletons}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className={styles.filter} key={index} />
          ))}
        </div>
        <div className={styles.grid}>
          {Array.from({ length: 8 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    </Status>
  )
}

export function ItemDetailSkeleton({ label }: SkeletonStatusProps) {
  return (
    <Status label={label}>
      <div className={styles.detail}>
        <Skeleton className={styles.detailMedia} />
        <div className={styles.detailCopy}>
          <Skeleton className={styles.eyebrow} />
          <Skeleton className={styles.title} />
          <Skeleton className={styles.copy} />
          <Skeleton className={styles.copy} />
          <Skeleton className={styles.copyShort} />
        </div>
      </div>
    </Status>
  )
}

export function ThankYouSkeleton({ label }: SkeletonStatusProps) {
  return (
    <Status label={label}>
      <div className={styles.thankYou}>
        <Skeleton className={styles.eyebrow} />
        <Skeleton className={styles.thankYouTitle} />
        <Skeleton className={styles.copy} />
        <Skeleton className={styles.copyShort} />
        <Skeleton className={styles.thankYouAction} />
      </div>
    </Status>
  )
}

export function ContactSkeleton({ label }: SkeletonStatusProps) {
  return (
    <Status label={label}>
      <div className={styles.page}>
        <IntroSkeleton />
        <div className={styles.contactLayout}>
          <div className={styles.contactColumn}>
            <Skeleton className={styles.cardLine} />
            {Array.from({ length: 2 }, (_, index) => (
              <Skeleton className={styles.contactCard} key={index} />
            ))}
          </div>
          <div className={styles.contactColumn}>
            <Skeleton className={styles.cardLine} />
            <Skeleton className={styles.copy} />
            <Skeleton className={styles.contactForm} />
          </div>
        </div>
      </div>
    </Status>
  )
}

export function AppBootstrapSkeleton({
  label,
  profile,
}: SkeletonStatusProps & { profile: boolean }) {
  if (profile) {
    return (
      <Status className={styles.bootstrapStatus} label={label}>
        <div className={styles.profileBootstrap}>
          <div className={styles.profileBootstrapCard}>
            <Skeleton className={styles.profilePortrait} />
            <Skeleton className={styles.profileName} />
            <Skeleton className={styles.profileRole} />
            <div className={styles.profileLinks}>
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton className={styles.profileLink} key={index} />
              ))}
            </div>
          </div>
        </div>
      </Status>
    )
  }

  return (
    <Status className={styles.bootstrapStatus} label={label}>
      <div className={styles.bootstrapHeader}>
        <Skeleton className={styles.bootstrapBrand} />
        <Skeleton className={styles.bootstrapNavigation} />
      </div>
      <div className={styles.page}>
        <IntroSkeleton />
      </div>
    </Status>
  )
}
