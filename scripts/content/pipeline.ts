import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import sharp from 'sharp'
import {
  validateImageResource,
  type ImageResource,
} from '../../src/content/image-resource.ts'
import {
  validateInfoResource,
  type InfoResource,
} from '../../src/content/info-resource.ts'

const publicExtensions = new Set([
  '.avif',
  '.jpeg',
  '.jpg',
  '.json',
  '.png',
  '.svg',
  '.webp',
])

export const contentMimeTypes: Record<string, string> = {
  '.avif': 'image/avif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
}

export interface PublicContentFile {
  absolutePath: string
  relativePath: string
  size: number
  mtimeMs: number
}

export interface ContentSnapshot {
  root: string
  info: InfoResource
  images: Map<string, ImageResource>
  indexJson: Record<string, string>
  publicFiles: Map<string, PublicContentFile>
}

function isInside(root: string, target: string): boolean {
  return target === root || target.startsWith(`${root}${sep}`)
}

async function parseJsonFile(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown
  } catch (error) {
    throw new Error(`Unable to parse JSON at ${path}`, { cause: error })
  }
}

async function collectPublicFiles(
  root: string,
): Promise<Map<string, PublicContentFile>> {
  const rootRealPath = await realpath(root)
  const files = new Map<string, PublicContentFile>()

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'README.md') {
        continue
      }

      const absolutePath = join(directory, entry.name)
      const relativePath = relative(root, absolutePath).split(sep).join('/')
      if (entry.isSymbolicLink()) {
        throw new Error(`Symbolic links are not allowed: ${relativePath}`)
      }
      if (entry.isDirectory()) {
        await walk(absolutePath)
        continue
      }
      if (!entry.isFile()) {
        throw new Error(`Unsupported content entry: ${relativePath}`)
      }

      const extension = extname(entry.name).toLowerCase()
      if (!publicExtensions.has(extension)) {
        throw new Error(`Unsupported content file: ${relativePath}`)
      }
      const resolvedPath = await realpath(absolutePath)
      if (!isInside(rootRealPath, resolvedPath)) {
        throw new Error(`Content file escapes its root: ${relativePath}`)
      }
      const fileStat = await stat(resolvedPath)
      files.set(relativePath, {
        absolutePath: resolvedPath,
        relativePath,
        size: fileStat.size,
        mtimeMs: fileStat.mtimeMs,
      })
    }
  }

  await walk(rootRealPath)
  return files
}

function relativeContentPath(url: string, owner: string): string {
  if (
    !url.startsWith('/content/') ||
    url.includes('..') ||
    url.includes('\\')
  ) {
    throw new Error(`${owner} must use a safe /content URL`)
  }
  return decodeURIComponent(url.slice('/content/'.length))
}

async function validateImageFile(
  file: PublicContentFile,
  width: number,
  height: number,
  owner: string,
): Promise<void> {
  const metadata = await sharp(file.absolutePath).metadata()
  if (metadata.width !== width || metadata.height !== height) {
    throw new Error(
      `${owner} declares ${width}x${height}, but file is ` +
        `${metadata.width ?? '?'}x${metadata.height ?? '?'}`,
    )
  }
}

async function validateImageFiles(
  image: ImageResource,
  publicFiles: Map<string, PublicContentFile>,
): Promise<void> {
  const originalPath = relativeContentPath(
    image.original.url,
    `Image ${image.id}`,
  )
  const original = publicFiles.get(originalPath)
  if (original === undefined) {
    throw new Error(`Image ${image.id} is missing ${originalPath}`)
  }
  await validateImageFile(
    original,
    image.width,
    image.height,
    `Image ${image.id} original`,
  )

  const expectedVariants = new Set<string>()
  for (const variant of image.variants) {
    const expectedHeight = Math.round(
      (variant.width * image.height) / image.width,
    )
    if (variant.height !== expectedHeight) {
      throw new Error(
        `Image ${image.id} variant ${variant.width} has a wrong height`,
      )
    }
    const sourceTypes = new Set<string>()
    for (const source of variant.sources) {
      if (sourceTypes.has(source.type)) {
        throw new Error(
          `Image ${image.id} variant ${variant.width} repeats ${source.type}`,
        )
      }
      sourceTypes.add(source.type)
      const relativePath = relativeContentPath(
        source.url,
        `Image ${image.id}`,
      )
      expectedVariants.add(relativePath)
      const file = publicFiles.get(relativePath)
      if (file === undefined) {
        throw new Error(`Image ${image.id} is missing ${relativePath}`)
      }
      await validateImageFile(
        file,
        variant.width,
        variant.height,
        `Image ${image.id} variant`,
      )
    }
  }

  const variantPrefix = `images/${image.id}/`
  for (const path of publicFiles.keys()) {
    if (
      path.startsWith(variantPrefix) &&
      /\/\d+\.(?:avif|jpg|webp)$/.test(path) &&
      !expectedVariants.has(path)
    ) {
      throw new Error(`Image ${image.id} has stale variant ${path}`)
    }
  }
}

async function loadImages(
  root: string,
  publicFiles: Map<string, PublicContentFile>,
): Promise<Map<string, ImageResource>> {
  const imagesRoot = join(root, 'images')
  const result = new Map<string, ImageResource>()
  for (const entry of await readdir(imagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      throw new Error(`Content images may only contain resource folders`)
    }
    const image = validateImageResource(
      await parseJsonFile(join(imagesRoot, entry.name, 'data.json')),
      entry.name,
    )
    await validateImageFiles(image, publicFiles)
    result.set(image.id, image)
  }
  return result
}

function validateInfoReferences(
  info: InfoResource,
  images: Map<string, ImageResource>,
): void {
  if (!images.has(info.images.portrait)) {
    throw new Error('Info references a missing portrait image')
  }
  if (!images.has(info.images.signature)) {
    throw new Error('Info references a missing signature image')
  }
}

export async function scanContent(
  requestedRoot: string,
): Promise<ContentSnapshot> {
  const root = await realpath(resolve(requestedRoot))
  const rootInfo = await lstat(root)
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    throw new Error('Content root must be a real directory')
  }

  const publicFiles = await collectPublicFiles(root)
  const info = validateInfoResource(
    await parseJsonFile(join(root, 'info/data.json')),
  )
  const images = await loadImages(root, publicFiles)
  validateInfoReferences(info, images)

  return {
    root,
    info,
    images,
    indexJson: {},
    publicFiles,
  }
}

async function listFiles(root: string): Promise<Map<string, number>> {
  const result = new Map<string, number>()

  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = join(directory, entry.name)
      if (entry.isDirectory()) {
        await walk(absolutePath)
      } else if (entry.isFile()) {
        const fileStat = await stat(absolutePath)
        result.set(
          relative(root, absolutePath).split(sep).join('/'),
          fileStat.size,
        )
      }
    }
  }

  await walk(root)
  return result
}

export async function writeContentArtifact(
  snapshot: ContentSnapshot,
  outputRoot: string,
): Promise<void> {
  const destination = resolve(outputRoot)
  await rm(destination, { force: true, recursive: true })
  await mkdir(destination, { recursive: true })

  for (const file of snapshot.publicFiles.values()) {
    const outputPath = join(destination, file.relativePath)
    await mkdir(dirname(outputPath), { recursive: true })
    await copyFile(file.absolutePath, outputPath)
  }
  for (const [path, json] of Object.entries(snapshot.indexJson)) {
    const outputPath = join(destination, path)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, json, 'utf8')
  }

  const outputFiles = await listFiles(destination)
  if (outputFiles.size !== snapshot.publicFiles.size) {
    throw new Error(
      `Content artifact expected ${snapshot.publicFiles.size} files, ` +
        `but received ${outputFiles.size}`,
    )
  }
  for (const file of snapshot.publicFiles.values()) {
    if (outputFiles.get(file.relativePath) !== file.size) {
      throw new Error(`Content artifact differs: ${file.relativePath}`)
    }
  }
}

export function isSafeContentRequest(pathname: string): boolean {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }
  if (!decoded.startsWith('/content/')) {
    return false
  }
  const relativePath = decoded.slice('/content/'.length)
  return (
    relativePath.length > 0 &&
    !relativePath.includes('\\') &&
    !relativePath
      .split('/')
      .some(
        (part) =>
          part === '' ||
          part === '.' ||
          part === '..' ||
          part.startsWith('.'),
      )
  )
}
