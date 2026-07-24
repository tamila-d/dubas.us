import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type SourceHTMLAttributes,
  type SyntheticEvent,
} from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import type {
  ImageCrop,
  ImageFocalPoint,
  ResponsiveImageData,
  ResponsiveImageTier,
} from '@/content/images'
import { cn } from '@/lib/utils'
import styles from './ResponsiveImage.module.css'

export type ResponsiveImageTierName = 'card' | 'detail' | 'zoom'

type TieredResponsiveImage<Tier extends ResponsiveImageTierName> = Pick<
  ResponsiveImageData,
  'alt' | 'aspectRatio' | 'height' | 'id' | 'width'
> &
  Record<Tier, ResponsiveImageTier> & {
    focalPoint?: ImageFocalPoint
  }

interface ResponsiveImageProps<Tier extends ResponsiveImageTierName>
  extends Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    'alt' | 'height' | 'loading' | 'sizes' | 'src' | 'srcSet' | 'width'
  > {
  image: TieredResponsiveImage<Tier>
  crop?: ImageCrop
  tier?: Tier
  priority?: boolean
  pictureClassName?: string
}

function srcSet(tier: ResponsiveImageTier, type: string): string | undefined {
  const candidates = tier.sources
    .filter((source) => source.type === type)
    .sort((left, right) => left.width - right.width)
    .map((source) => `${source.src} ${source.width}w`)

  return candidates.length === 0 ? undefined : candidates.join(', ')
}

export function responsiveImageFallbackProps<
  Tier extends ResponsiveImageTierName,
>(
  image: TieredResponsiveImage<Tier>,
  tierName: Tier,
): Pick<
  ImgHTMLAttributes<HTMLImageElement>,
  'height' | 'sizes' | 'src' | 'srcSet' | 'width'
> {
  const tier = image[tierName]
  return {
    src: tier.fallback,
    sizes: tier.sizes,
    width: image.width,
    height: image.height,
  }
}

export function responsiveImageSourceProps<
  Tier extends ResponsiveImageTierName,
>(
  image: TieredResponsiveImage<Tier>,
  tierName: Tier,
  type: string,
): Pick<SourceHTMLAttributes<HTMLSourceElement>, 'sizes' | 'srcSet'> {
  const tier = image[tierName]
  return {
    srcSet: srcSet(tier, type),
    sizes: tier.sizes,
  }
}

export function ResponsiveImage<Tier extends ResponsiveImageTierName = 'card'>({
  image,
  crop,
  tier: tierName = 'card' as Tier,
  priority = false,
  pictureClassName,
  className,
  style,
  onError,
  onLoad,
  ...props
}: ResponsiveImageProps<Tier>) {
  const fallback = responsiveImageFallbackProps(image, tierName)
  const imageElementRef = useRef<HTMLImageElement>(null)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    'loading',
  )
  const objectPosition = image.focalPoint
    ? `${image.focalPoint.x * 100}% ${image.focalPoint.y * 100}%`
    : undefined
  const cropStyle: CSSProperties | undefined = crop === undefined
    ? undefined
    : {
        height: `${(image.height / crop.size) * 100}%`,
        left: `${(-crop.x / crop.size) * 100}%`,
        maxWidth: 'none',
        objectFit: 'fill',
        position: 'absolute',
        top: `${(-crop.y / crop.size) * 100}%`,
        width: `${(image.width / crop.size) * 100}%`,
      }

  useLayoutEffect(() => {
    const element = imageElementRef.current
    setStatus(
      element?.complete
        ? element.naturalWidth > 0
          ? 'loaded'
          : 'error'
        : 'loading',
    )
  }, [fallback.src])

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    setStatus('loaded')
    onLoad?.(event)
  }

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    setStatus('error')
    onError?.(event)
  }

  return (
    <span className={cn(styles.root, pictureClassName)}>
      <span className={styles.frame}>
        {status === 'loaded' ? null : (
          <Skeleton
            aria-hidden="true"
            className={cn(
              styles.placeholder,
              status === 'error' && styles.placeholderError,
            )}
          />
        )}
        <picture
          className={styles.picture}
          data-crop={crop === undefined ? undefined : ''}
        >
          <source
            type="image/avif"
            {...responsiveImageSourceProps(image, tierName, 'image/avif')}
          />
          <source
            type="image/webp"
            {...responsiveImageSourceProps(image, tierName, 'image/webp')}
          />
          <img
            {...props}
            {...fallback}
            alt={image.alt}
            className={cn(className, status !== 'loaded' && styles.pendingImage)}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            loading={priority ? 'eager' : 'lazy'}
            onError={handleError}
            onLoad={handleLoad}
            ref={imageElementRef}
            style={{ objectPosition, ...style, ...cropStyle }}
          />
        </picture>
      </span>
    </span>
  )
}
