import type {
  ImageCrop,
  ResponsiveImageData,
} from './images.ts'
import type { ImageResourceSource } from './image-resource.ts'

export interface PortfolioItemResource {
  schemaVersion: 1
  id: string
  title: string
  description: string
  location: string
  createdAt: string | null
  type: string
  image: string
  crop: ImageCrop
  coordinates: PortfolioCoordinates
  seed?: true
}

export interface PortfolioCoordinates {
  latitude: number
  longitude: number
}

export interface PortfolioCatalogEntry {
  id: string
  group: string
}

export interface PortfolioCatalogResource {
  items: PortfolioCatalogEntry[]
}

export interface PortfolioIndexEntry {
  id: string
  title: string
  location: string
  createdAt: string | null
  type: string
  crop: ImageCrop
  image: ResponsiveImageData
}

export interface PortfolioIndexResource {
  schemaVersion: 1
  items: PortfolioIndexEntry[]
}

export interface PortfolioItemDetailResource {
  item: PortfolioItemResource
  image: ResponsiveImageData & {
    original: ImageResourceSource
  }
}

export class PortfolioResourceValidationError extends Error {
  override name = 'PortfolioResourceValidationError'
}

function fail(path: string, expectation: string): never {
  throw new PortfolioResourceValidationError(`${path} must be ${expectation}`)
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'an object')
  }
  return value as Record<string, unknown>
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fail(path, 'a non-empty string')
  }
  return value.trim()
}

function id(value: unknown, path: string): string {
  const candidate = string(value, path)
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(candidate)) {
    return fail(path, 'a URL-safe alphanumeric id')
  }
  return candidate
}

function group(value: unknown, path: string): string {
  const candidate = string(value, path)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate)) {
    return fail(path, 'a lowercase URL-safe group')
  }
  return candidate
}

function date(value: unknown, path: string): string {
  const candidate = string(value, path)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(candidate) ||
    Number.isNaN(Date.parse(`${candidate}T00:00:00Z`))
  ) {
    return fail(path, 'an ISO calendar date')
  }
  return candidate
}

function nullableDate(value: unknown, path: string): string | null {
  return value === null ? null : date(value, path)
}

function coordinate(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    return fail(path, `a number from ${minimum} to ${maximum}`)
  }
  return value
}

function integer(
  value: unknown,
  path: string,
  minimum: number,
): number {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < minimum
  ) {
    return fail(path, `an integer greater than or equal to ${minimum}`)
  }
  return value as number
}

function crop(value: unknown, path: string): ImageCrop {
  const input = record(value, path)
  return {
    x: integer(input.x, `${path}.x`, 0),
    y: integer(input.y, `${path}.y`, 0),
    size: integer(input.size, `${path}.size`, 1),
  }
}

export function validatePortfolioCropBounds(
  value: ImageCrop,
  imageWidth: number,
  imageHeight: number,
  path = 'portfolioItem.crop',
): void {
  if (value.x + value.size > imageWidth) {
    fail(path, `inside the image width of ${imageWidth}px`)
  }
  if (value.y + value.size > imageHeight) {
    fail(path, `inside the image height of ${imageHeight}px`)
  }
}

function coordinates(
  value: unknown,
  path: string,
): PortfolioCoordinates {
  const input = record(value, path)
  return {
    latitude: coordinate(
      input.latitude,
      `${path}.latitude`,
      -90,
      90,
    ),
    longitude: coordinate(
      input.longitude,
      `${path}.longitude`,
      -180,
      180,
    ),
  }
}

export function validatePortfolioItemResource(
  value: unknown,
  expectedId?: string,
): PortfolioItemResource {
  const input = record(value, 'portfolioItem')
  if (input.schemaVersion !== 1) {
    return fail('portfolioItem.schemaVersion', 'schema version 1')
  }

  const itemId = id(input.id, 'portfolioItem.id')
  if (expectedId !== undefined && itemId !== expectedId) {
    return fail('portfolioItem.id', `"${expectedId}"`)
  }
  if (input.seed !== undefined && input.seed !== true) {
    return fail('portfolioItem.seed', 'true when present')
  }

  return {
    schemaVersion: 1,
    id: itemId,
    title: string(input.title, 'portfolioItem.title'),
    description: string(
      input.description,
      'portfolioItem.description',
    ),
    location: string(input.location, 'portfolioItem.location'),
    createdAt: nullableDate(
      input.createdAt,
      'portfolioItem.createdAt',
    ),
    type: group(input.type, 'portfolioItem.type'),
    image: id(input.image, 'portfolioItem.image'),
    crop: crop(input.crop, 'portfolioItem.crop'),
    coordinates: coordinates(
      input.coordinates,
      'portfolioItem.coordinates',
    ),
    ...(input.seed === true ? { seed: true as const } : {}),
  }
}

export function validatePortfolioCatalogResource(
  value: unknown,
): PortfolioCatalogResource {
  const input = record(value, 'portfolio')
  if (!Array.isArray(input.items)) {
    return fail('portfolio.items', 'an array')
  }

  const itemIds = new Set<string>()
  const items = input.items.map((value, index) => {
    const path = `portfolio.items[${index}]`
    const item = record(value, path)
    const itemId = id(item.id, `${path}.id`)
    if (itemIds.has(itemId)) {
      return fail(`${path}.id`, 'unique')
    }
    itemIds.add(itemId)

    return {
      id: itemId,
      group: group(item.group, `${path}.group`),
    }
  })

  return { items }
}
