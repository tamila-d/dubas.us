import type { ReactNode } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'

export type PortfolioFilterOption = {
  label: string
  value: string
}

type PortfolioFilterButtonsProps = {
  arrowControl?: ReactNode
  expanded?: boolean
  label: string
  onIntent?: () => void
  onOpen: () => void
}

export function PortfolioFilterButtons({
  arrowControl,
  expanded = false,
  label,
  onIntent,
  onOpen,
}: PortfolioFilterButtonsProps) {
  return (
    <ButtonGroup
      aria-label="Filter portfolio by type"
      className="w-full max-w-44"
      onFocus={onIntent}
      onPointerDown={onIntent}
      onPointerEnter={onIntent}
    >
      <Button
        aria-expanded={expanded}
        aria-haspopup="menu"
        className="min-w-0 flex-1 justify-start"
        onClick={onOpen}
        size="touch"
        type="button"
        variant="outline"
      >
        {label}
      </Button>
      {arrowControl ?? (
        <Button
          aria-expanded={expanded}
          aria-haspopup="menu"
          aria-label="Choose portfolio category"
          className="w-(--touch-target) px-0"
          onClick={onOpen}
          size="touch"
          type="button"
          variant="outline"
        >
          <ChevronDownIcon aria-hidden="true" />
        </Button>
      )}
    </ButtonGroup>
  )
}
