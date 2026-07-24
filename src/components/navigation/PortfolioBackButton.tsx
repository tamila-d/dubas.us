import { ArrowLeftIcon } from 'lucide-react'
import {
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { APP_ROUTES } from '@/config/routes'

interface PortfolioBackButtonProps {
  className?: string
}

function portfolioReturnTo(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null) {
    return undefined
  }

  const value = (state as { portfolioReturnTo?: unknown })
    .portfolioReturnTo
  return typeof value === 'string' &&
    /^\/portfolio(?:\?[^#]*)?$/.test(value)
    ? value
    : undefined
}

export function PortfolioBackButton({
  className,
}: PortfolioBackButtonProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = portfolioReturnTo(location.state)

  const goBack = () => {
    const historyIndex =
      typeof window.history.state?.idx === 'number'
        ? window.history.state.idx
        : 0

    if (returnTo !== undefined && historyIndex > 0) {
      void navigate(-1)
      return
    }

    void navigate(returnTo ?? APP_ROUTES.portfolio)
  }

  return (
    <Button
      className={className}
      onClick={goBack}
      size="touch"
      type="button"
    >
      <ArrowLeftIcon data-icon="inline-start" />
      Back
    </Button>
  )
}
