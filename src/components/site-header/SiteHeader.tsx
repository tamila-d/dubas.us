import { Link, NavLink } from 'react-router-dom'
import { PortfolioBackButton } from '@/components/navigation/PortfolioBackButton'
import { buttonVariants } from '@/components/ui/button'
import { APP_ROUTES } from '@/config/routes'
import { cn } from '@/lib/utils'
import styles from './SiteHeader.module.css'

interface SiteHeaderProps {
  artistName: string
  showPortfolioBack?: boolean
}

const brandClassName = buttonVariants({
  size: 'touch',
  variant: 'ghost',
})
const navigationClassName = buttonVariants({
  size: 'touch',
  variant: 'ghost',
})

export function SiteHeader({
  artistName,
  showPortfolioBack = false,
}: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {showPortfolioBack ? (
          <PortfolioBackButton className={styles.mobileBack} />
        ) : null}
        <Link
          aria-label={`${artistName} — Portfolio`}
          className={cn(
            brandClassName,
            styles.brand,
            showPortfolioBack && styles.portfolioItemBrand,
          )}
          to={APP_ROUTES.portfolio}
        >
          <img
            aria-hidden="true"
            className={styles.brandIcon}
            src="/favicon.svg"
          />
          <span className={styles.brandName}>{artistName}</span>
        </Link>
        <nav aria-label="Main navigation">
          <ul className={styles.navigation}>
            <li>
              <NavLink
                className={({ isActive }) =>
                  cn(
                    navigationClassName,
                    styles.navigationLink,
                    isActive && styles.navigationLinkActive,
                  )
                }
                to={APP_ROUTES.portfolio}
              >
                Portfolio
              </NavLink>
            </li>
            <li>
              <NavLink
                className={({ isActive }) =>
                  cn(
                    navigationClassName,
                    styles.navigationLink,
                    isActive && styles.navigationLinkActive,
                  )
                }
                end
                to={APP_ROUTES.contact}
              >
                Contact
              </NavLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
