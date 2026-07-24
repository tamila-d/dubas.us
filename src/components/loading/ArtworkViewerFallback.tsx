import type { RefObject } from 'react'
import { ResponsiveImage } from '@/components/media/ResponsiveImage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ArtworkViewerImage } from '@/features/item-viewer/viewer-contract'
import styles from './ArtworkViewerFallback.module.css'

interface ArtworkViewerFallbackProps {
  finalFocus?: RefObject<HTMLElement | null>
  image: ArtworkViewerImage
  onClose: () => void
  title: string
}

export function ArtworkViewerFallback({
  finalFocus,
  image,
  onClose,
  title,
}: ArtworkViewerFallbackProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        className={styles.viewer}
        finalFocus={finalFocus ?? false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Preparing the full-screen artwork viewer.
          </DialogDescription>
        </DialogHeader>
        <ResponsiveImage
          className={styles.image}
          image={image}
          pictureClassName={styles.picture}
          priority
          tier="detail"
        />
      </DialogContent>
    </Dialog>
  )
}
