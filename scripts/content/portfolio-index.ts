import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import {
  validatePortfolioItemResource,
  type PortfolioCatalogResource,
  type PortfolioItemResource,
} from '../../src/content/portfolio-resource.ts'

export interface PortfolioIndexGenerationResult {
  changed: boolean
  items: number
  newest: string | undefined
  oldest: string | undefined
}

async function portfolioItems(
  contentRoot: string,
): Promise<PortfolioItemResource[]> {
  const portfolioRoot = join(contentRoot, 'portfolio')
  const items: PortfolioItemResource[] = []

  for (const entry of await readdir(portfolioRoot, { withFileTypes: true })) {
    if (entry.name === 'data.json' && entry.isFile()) {
      continue
    }
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      throw new Error(
        'Content portfolio may only contain data.json and resource folders',
      )
    }

    const item = validatePortfolioItemResource(
      JSON.parse(
        await readFile(join(portfolioRoot, entry.name, 'data.json'), 'utf8'),
      ) as unknown,
      entry.name,
    )
    if (item.createdAt === null) {
      throw new Error(
        `Portfolio item ${item.id} needs createdAt before indexing`,
      )
    }
    items.push(item)
  }

  return items.toSorted((left, right) => {
    const dateOrder = right.createdAt!.localeCompare(left.createdAt!)
    return dateOrder === 0 ? left.id.localeCompare(right.id) : dateOrder
  })
}

export async function generatePortfolioIndex(
  requestedRoot: string,
): Promise<PortfolioIndexGenerationResult> {
  const contentRoot = resolve(requestedRoot)
  const items = await portfolioItems(contentRoot)
  const catalog: PortfolioCatalogResource = {
    items: items.map((item) => ({
      id: item.id,
      group: item.type,
      availableForPurchase: item.availableForPurchase,
    })),
  }
  const target = join(contentRoot, 'portfolio', 'data.json')
  const nextContent = `${JSON.stringify(catalog, null, 2)}\n`
  const currentContent = await readFile(target, 'utf8').catch(
    (error: unknown) => {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return ''
      }
      throw error
    },
  )
  const changed = currentContent !== nextContent

  if (changed) {
    await writeFile(target, nextContent)
  }

  return {
    changed,
    items: items.length,
    newest: items[0]?.createdAt ?? undefined,
    oldest: items.at(-1)?.createdAt ?? undefined,
  }
}
