import { Link } from 'react-router-dom'
import {
  CopyIcon,
  ImagesIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { APP_ROUTES } from '@/config/routes'
import { useCropController } from './useCropController'
import styles from './CropPage.module.css'

export interface CropImageSource {
  height: number
  id: string
  key: string
  url: string
  width: number
}

interface CropWorkspaceProps {
  image: CropImageSource
}

export function CropWorkspace({ image }: CropWorkspaceProps) {
  const {
    cropRef,
    handlers,
    maxZoom,
    recipe,
    reset,
    setZoom,
    transform,
    viewportSize,
    zoom,
  } = useCropController(image)

  const copyCropParameters = async () => {
    if (recipe === null) {
      return
    }

    const parameters = JSON.stringify(
      {
        id: image.id,
        crop: {
          x: recipe.x,
          y: recipe.y,
          size: recipe.width,
        },
      },
      null,
      2,
    )

    try {
      await navigator.clipboard.writeText(parameters)
      toast.success('Crop parameters copied.')
    } catch {
      toast.error('Crop parameters could not be copied.')
    }
  }

  const imageStyle = transform.scale > 0
    ? {
        height: `${image.height * transform.scale}px`,
        transform:
          `translate(calc(-50% + ${transform.x}px), ` +
          `calc(-50% + ${transform.y}px))`,
        width: `${image.width * transform.scale}px`,
      }
    : undefined
  const zoomValue = Math.min(maxZoom, Math.max(1, zoom))

  return (
    <div className={styles.workspace}>
      <div
        {...handlers}
        aria-label="Square crop preview. Drag to move the image, pinch or scroll to zoom, and use arrow keys for precise movement."
        className={styles.cropWindow}
        ref={cropRef}
        role="region"
        tabIndex={0}
      >
        <img
          alt=""
          className={styles.cropImage}
          draggable="false"
          src={image.url}
          style={imageStyle}
        />
        <div aria-hidden="true" className={styles.cropGrid} />

        {recipe === null ? null : (
          <aside
            aria-label="Crop coordinates from the original image"
            className={styles.recipe}
          >
            <p className={styles.recipeLabel}>Crop from original</p>
            <dl className={styles.recipeGrid}>
              <div>
                <dt>X</dt>
                <dd>{recipe.x}px</dd>
              </div>
              <div>
                <dt>Y</dt>
                <dd>{recipe.y}px</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>
                  {recipe.width} × {recipe.height}px
                </dd>
              </div>
              <div>
                <dt>Original</dt>
                <dd>
                  {image.width} × {image.height}px
                </dd>
              </div>
            </dl>
          </aside>
        )}
      </div>

      <header className={styles.toolbar}>
        <div className={styles.toolbarTitle}>
          <p>Private studio tool</p>
          <h1>Square crop</h1>
        </div>
        <Link
          className={buttonVariants({
            size: 'touch',
            variant: 'crop',
          })}
          to={APP_ROUTES.crop}
        >
          <ImagesIcon data-icon="inline-start" />
          All images
        </Link>
      </header>

      <div
        aria-label="Crop controls"
        className={styles.controls}
        role="group"
      >
        <div className={styles.zoomControl}>
          <span className={styles.zoomLabel}>
            Zoom
            <output>{Math.round(zoomValue * 100)}%</output>
          </span>
          <Slider
            aria-label="Image zoom"
            disabled={maxZoom <= 1}
            max={Math.max(1.01, maxZoom)}
            min={1}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value
              setZoom(next)
            }}
            step={0.01}
            value={[zoomValue]}
          />
        </div>
        <Button
          onClick={reset}
          size="touch"
          type="button"
        >
          <RotateCcwIcon data-icon="inline-start" />
          Reset
        </Button>
        <Button
          disabled={recipe === null || viewportSize <= 0}
          aria-label="Copy crop parameters"
          onClick={copyCropParameters}
          size="touch"
          type="button"
        >
          <CopyIcon data-icon="inline-start" />
          Copy parameters
        </Button>
      </div>
    </div>
  )
}
