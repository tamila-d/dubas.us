import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PortfolioFilterButtons,
  type PortfolioFilterOption,
} from './PortfolioFilterButtons'

type PortfolioFilterMenuProps = {
  initialOpen?: boolean
  label: string
  onValueChange: (value: string) => void
  options: PortfolioFilterOption[]
  value: string
}

export function PortfolioFilterMenu({
  initialOpen = false,
  label,
  onValueChange,
  options,
  value,
}: PortfolioFilterMenuProps) {
  const [open, setOpen] = useState(initialOpen)

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <PortfolioFilterButtons
        arrowControl={
          <DropdownMenuTrigger
            render={
              <Button
                aria-label="Choose portfolio category"
                className="w-(--touch-target) px-0"
                size="touch"
                type="button"
                variant="outline"
              />
            }
          >
            <ChevronDownIcon aria-hidden="true" />
          </DropdownMenuTrigger>
        }
        expanded={open}
        label={label}
        onOpen={() => {
          setOpen((currentOpen) => !currentOpen)
        }}
      />
      <DropdownMenuContent
        align="end"
        className="min-w-44 min-[560px]:hidden"
      >
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            onValueChange={(nextValue) => {
              onValueChange(String(nextValue))
              setOpen(false)
            }}
            value={value}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
