import {
  readFile,
  readdir,
  rm,
  stat,
} from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import sharp from 'sharp'
import {
  validateImageResource,
  type ContentImageMimeType,
  type ImageResource,
  type ImageResourceSource,
  type ImageResourceVariant,
} from '../../src/content/image-resource.ts'
import {
  IMAGE_BYTE_BUDGETS,
  widthsForTier,
  type ImageTierName,
} from '../../src/content/images.ts'

const generatedFilePattern = /^\d+\.(?:avif|jpg|webp)$/

interface ImageJob {
  image: ImageResource
  directory: string
  sourcePath: string
  outputs: Array<{
    path: string
    source: ImageResourceSource
    variant: ImageResourceVariant
  }>
}

export interface ImageGenerationResult {
  generated: number
  images: number
}

function pathInside(root: string, target: string): boolean {
  return target === root || target.startsWith(`${root}${sep}`)
}

function relativeContentPath(url: string): string {
  if (!url.startsWith('/content/') || url.includes('..') || url.includes('\\')) {
    throw new Error(`Unsafe image URL: ${url}`)
  }
  return decodeURIComponent(url.slice('/content/'.length))
}

async function discoverJobs(contentRoot: string): Promise<ImageJob[]> {
  const imagesRoot = join(contentRoot, 'images')
  const entries = await readdir(imagesRoot, { withFileTypes: true })
  const jobs: ImageJob[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      throw new Error('Content images may only contain resource folders')
    }
    const directory = join(imagesRoot, entry.name)
    const image = validateImageResource(
      JSON.parse(await readFile(join(directory, 'data.json'), 'utf8')) as unknown,
      entry.name,
    )
    const sourcePath = resolve(
      contentRoot,
      relativeContentPath(image.original.url),
    )
    if (!pathInside(contentRoot, sourcePath)) {
      throw new Error(`Image ${image.id} original escapes content`)
    }

    const outputs = image.variants.flatMap((variant) =>
      variant.sources.map((source) => {
        const path = resolve(contentRoot, relativeContentPath(source.url))
        if (!pathInside(directory, path)) {
          throw new Error(`Image ${image.id} variant escapes its folder`)
        }
        return { path, source, variant }
      }),
    )
    jobs.push({ image, directory, sourcePath, outputs })
  }
  return jobs
}

function encode(
  image: sharp.Sharp,
  type: ContentImageMimeType,
): sharp.Sharp {
  if (type === 'image/avif') {
    return image.avif({ effort: 4, quality: 56 })
  }
  if (type === 'image/webp') {
    return image.webp({ effort: 4, quality: 80 })
  }
  if (type === 'image/jpeg') {
    return image.jpeg({ mozjpeg: true, quality: 82 })
  }
  throw new Error(`SVG is not a generated raster format`)
}

function byteBudget(
  sourceWidth: number,
  variantWidth: number,
): number {
  const tiers = (
    Object.keys(IMAGE_BYTE_BUDGETS) as ImageTierName[]
  ).filter((tier) =>
    widthsForTier(sourceWidth, tier).includes(variantWidth),
  )
  if (tiers.length === 0) {
    throw new Error(
      `Image variant ${variantWidth} does not belong to a responsive tier`,
    )
  }
  return Math.min(...tiers.map((tier) => IMAGE_BYTE_BUDGETS[tier]))
}

async function removeStaleOutputs(
  directory: string,
  expectedPaths: ReadonlySet<string>,
): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      generatedFilePattern.test(entry.name) &&
      !expectedPaths.has(join(directory, entry.name))
    ) {
      await rm(join(directory, entry.name), { force: true })
    }
  }
}

async function generateJob(job: ImageJob): Promise<number> {
  const expectedPaths = new Set(job.outputs.map((output) => output.path))
  await removeStaleOutputs(job.directory, expectedPaths)
  if (job.outputs.length === 0) {
    return 0
  }

  const source = await readFile(job.sourcePath)
  const metadata = await sharp(source).metadata()
  if (
    metadata.width !== job.image.width ||
    metadata.height !== job.image.height
  ) {
    throw new Error(
      `Image ${job.image.id} declares ${job.image.width}x${job.image.height}, ` +
        `but original is ${metadata.width ?? '?'}x${metadata.height ?? '?'}`,
    )
  }

  await Promise.all(
    job.outputs.map(async ({ path, source: candidate, variant }) => {
      const resized = sharp(source)
        .autoOrient()
        .resize({
          width: variant.width,
          height: variant.height,
          fit: 'fill',
          withoutEnlargement: true,
        })
      await encode(resized, candidate.type).toFile(path)
      const outputStat = await stat(path)
      const budget = byteBudget(job.image.width, variant.width)
      if (outputStat.size > budget) {
        throw new Error(
          `Image ${job.image.id} variant ${variant.width} exceeds ` +
            `${Math.round(budget / 1000)} KB`,
        )
      }
    }),
  )

  return job.outputs.length
}

export async function generateContentImages(
  requestedRoot: string,
): Promise<ImageGenerationResult> {
  const contentRoot = resolve(requestedRoot)
  const jobs = await discoverJobs(contentRoot)
  let generated = 0

  for (const job of jobs) {
    const count = await generateJob(job)
    generated += count
  }

  return {
    generated,
    images: jobs.length,
  }
}
