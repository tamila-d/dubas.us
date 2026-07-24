import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { CardClient } from '../../src/content/clients/CardClient.ts'
import { ContentClient } from '../../src/content/clients/ContentClient.ts'
import { PortfolioClient } from '../../src/content/clients/PortfolioClient.ts'
import { scanContent } from './pipeline.ts'

const originalFetch = globalThis.fetch
const requests: string[] = []
const snapshot = await scanContent(resolve('content'))
const responses = new Map<string, string>()
for (const file of snapshot.publicFiles.values()) {
  if (file.relativePath.endsWith('.json')) {
    responses.set(
      `/content/${file.relativePath}`,
      await readFile(file.absolutePath, 'utf8'),
    )
  }
}

globalThis.fetch = (async (input) => {
  const url = String(input)
  requests.push(url)
  const body = responses.get(url)
  return body === undefined
    ? new Response('Not found', { status: 404 })
    : new Response(body, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
}) as typeof fetch

const contentClient = new ContentClient()

try {
  const cardClient = new CardClient(contentClient)
  const card = await cardClient.get()

  assert.equal(card.info.artist.firstName, 'Tamila')
  assert.deepEqual(card.info.contact, {
    email: 'art@dubas.us',
    phone: '+1 (646) 598-4538',
  })
  assert.equal(card.info.links.website, 'https://dubas.us/')
  assert.deepEqual(card.info.images, {
    portrait: 'portrait',
    signature: 'signature',
  })
  assert.deepEqual(
    card.portrait.card.sources
      .map((source) => source.width)
      .filter((width, index, widths) => widths.indexOf(width) === index),
    [160, 240],
  )
  assert.equal(
    card.portrait.card.fallback,
    '/content/images/portrait/240.webp',
    'Card fallback must not download the original portrait',
  )
  assert.ok(
    card.portrait.card.sources.every(
      (source) =>
        source.src !== '/content/images/portrait/original.jpg',
    ),
    'Card responsive sources must not include the original portrait',
  )
  assert.ok(
    card.portrait.detail.sources.some(
      (source) =>
        source.src === '/content/images/portrait/320.jpg' &&
        source.type === 'image/jpeg',
    ),
    'Contact downloads require the optimized 320 px JPEG portrait',
  )

  await cardClient.get()
  assert.equal(
    requests.length,
    3,
    'Card requests should share the content cache',
  )

  const portfolioClient = new PortfolioClient(contentClient)
  const expectedCatalog = JSON.parse(
    responses.get('/content/portfolio/data.json')!,
  ) as {
    items: Array<{
      id: string
      group: string
      availableForPurchase: boolean
    }>
  }
  const requestCountBeforeCatalog = requests.length
  const catalog = await portfolioClient.getCatalog()
  assert.equal(
    requests.length,
    requestCountBeforeCatalog + 1,
    'Portfolio catalog loading must request only the catalog index',
  )
  assert.equal(
    requests.at(-1),
    '/content/portfolio/data.json',
    'Portfolio catalog must be the first portfolio request',
  )
  assert.deepEqual(
    catalog,
    expectedCatalog,
    'Portfolio catalog loading must preserve the authored index',
  )
  const portfolio = await portfolioClient.getIndexFromCatalog(catalog)
  assert.equal(portfolio.items.length, 14)
  assert.deepEqual(
    portfolio.items.map((item) => item.id),
    expectedCatalog.items.map((item) => item.id),
    'Portfolio client must preserve the explicit catalog order',
  )
  assert.ok(
    portfolio.items.every((item) => item.createdAt !== null),
    'Portfolio catalog items require createdAt',
  )
  assert.deepEqual(
    portfolio.items.map((item) => item.createdAt),
    portfolio.items
      .map((item) => item.createdAt)
      .toSorted((left, right) => right!.localeCompare(left!)),
    'Portfolio catalog must be sorted by createdAt newest first',
  )
  assert.deepEqual(
    [...new Set(portfolio.items.map((item) => item.type))].sort(),
    [...new Set(expectedCatalog.items.map((item) => item.group))].sort(),
    'Portfolio filters must come from catalog groups',
  )
  assert.deepEqual(
    expectedCatalog.items
      .filter((item) => item.availableForPurchase)
      .map((item) => item.id)
      .sort(),
    ['FRP3sv9X', 'LCsu8yWv', 'RgDKYZ9v', 'YGaGxY9A'].sort(),
    'Portfolio index must expose availability for stable filtered layouts',
  )
  assert.deepEqual(
    portfolio.items
      .filter((item) => item.availableForPurchase)
      .map((item) => item.id)
      .sort(),
    ['FRP3sv9X', 'LCsu8yWv', 'RgDKYZ9v', 'YGaGxY9A'].sort(),
    'Portfolio availability must come from authored item data',
  )
  assert.deepEqual(
    portfolio.items
      .filter((item) => item.commissioned)
      .map((item) => item.id)
      .sort(),
    ['WbRVG7y4', 'kyQw7CXK'].sort(),
    'Commissioned originals must remain identifiable for future filters',
  )
  assert.deepEqual(
    portfolio.items[0]?.image.card.sources.map((source) => source.width),
    [160, 240],
  )
  assert.ok(
    portfolio.items.every((item) =>
      item.image.card.sources.every(
        (source) => !source.src.includes('/original.'),
      ),
    ),
    'Portfolio previews must not download original images',
  )
  assert.deepEqual(
    Object.fromEntries(
      portfolio.items.map((portfolioItem) => [
        portfolioItem.id,
        portfolioItem.crop,
      ]),
    ),
    {
      aZpRH4Gg: { x: 0, y: 272, size: 1500 },
      FRP3sv9X: { x: 0, y: 472, size: 1351 },
      A2SoVKNn: { x: 0, y: 384, size: 1499 },
      kyQw7CXK: { x: 0, y: 0, size: 2670 },
      RgDKYZ9v: { x: 0, y: 454, size: 1350 },
      '96sNm26A': { x: 0, y: 758, size: 1500 },
      LCsu8yWv: { x: 55, y: 450, size: 1000 },
      fc7oh7Dr: { x: 0, y: 362, size: 1361 },
      YGaGxY9A: { x: 0, y: 87, size: 1363 },
      D3zBuhta: { x: 0, y: 156, size: 1350 },
      WbRVG7y4: { x: 0, y: 645, size: 2407 },
      '5mS2DBFs': { x: 215, y: 0, size: 1493 },
      bx8kHC7P: { x: 0, y: 191, size: 1352 },
      KuZENN2d: { x: 0, y: 231, size: 1001 },
    },
    'Portfolio client must preserve each authored thumbnail crop',
  )
  const item = await portfolioClient.getItem('RgDKYZ9v')
  assert.equal(item.title, 'Dutch baby')
  assert.equal(item.availableForPurchase, true)
  assert.equal(item.commissioned, false)
  assert.equal(item.image, 'RgDKYZ9v')
  assert.deepEqual(item.crop, { x: 0, y: 454, size: 1350 })
  assert.deepEqual(item.coordinates, {
    latitude: 40.855363,
    longitude: -73.937358,
  })
  const detail = await portfolioClient.getDetail('RgDKYZ9v')
  assert.equal(detail.item.id, item.id)
  assert.equal(detail.image.id, item.image)
  assert.equal(
    detail.image.original.url,
    '/content/images/RgDKYZ9v/original.jpg',
  )
  assert.ok(
    detail.image.detail.sources.every(
      (source) => !source.src.includes('/original.'),
    ),
    'Portfolio details must use optimized images',
  )
  assert.deepEqual(
    detail.image.detail.sources.map((source) => source.width),
    [480, 640, 960, 1280],
  )
  assert.deepEqual(detail.image.zoom.sources, [])
  assert.equal(
    detail.image.zoom.fallback,
    '/content/images/RgDKYZ9v/original.jpg',
    'Smaller originals should only be available to the on-demand zoom tier',
  )
  const largeDetail = await portfolioClient.getDetail('kyQw7CXK')
  assert.deepEqual(
    largeDetail.image.zoom.sources.map((source) => source.width),
    [1920, 2560],
  )
  assert.equal(
    largeDetail.image.zoom.fallback,
    '/content/images/kyQw7CXK/2560.webp',
  )
  assert.deepEqual(requests.sort(), [...responses.keys()].sort())

  console.log('Parallel Card and Portfolio REST content clients passed')
} finally {
  globalThis.fetch = originalFetch
  contentClient.invalidate()
}
