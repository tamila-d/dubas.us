import assert from 'node:assert/strict'
import { access, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { generateContentImages } from './image-pipeline.ts'
import { scanContent } from './pipeline.ts'

const contentRoot = resolve(process.cwd(), 'content')
const portraitDirectory = join(
  contentRoot,
  'images',
  'portrait',
)
const removedCandidate = join(portraitDirectory, '240.webp')
const staleCandidate = join(portraitDirectory, '999.webp')
const retiredCache = join(portraitDirectory, '.cache.json')

await generateContentImages(contentRoot)
await rm(removedCandidate, { force: true })
const recovered = await generateContentImages(contentRoot)
assert.ok(recovered.generated > 0)
await access(removedCandidate)

await writeFile(staleCandidate, 'stale image fixture', 'utf8')
await assert.rejects(
  () => scanContent(contentRoot),
  /stale variant/,
)
await generateContentImages(contentRoot)
await assert.rejects(() => access(staleCandidate))

const snapshot = await scanContent(contentRoot)
const portrait = snapshot.images.get('portrait')
assert.ok(portrait)
assert.deepEqual(
  portrait.variants.map((variant) => variant.width),
  [160, 240, 320],
)
assert.deepEqual(
  portrait.variants.map((variant) => ({
    width: variant.width,
    types: variant.sources.map((source) => source.type).sort(),
  })),
  [
    {
      width: 160,
      types: ['image/webp'],
    },
    {
      width: 240,
      types: ['image/webp'],
    },
    {
      width: 320,
      types: ['image/jpeg'],
    },
  ],
)
assert.ok(
  portrait.variants.every((variant) =>
    variant.sources.every((source) =>
      source.url.startsWith('/content/images/portrait/'),
    ),
  ),
)
await assert.rejects(() => access(retiredCache))

for (const item of snapshot.portfolio.values()) {
  const image = snapshot.images.get(item.image)
  assert.ok(image)
  assert.ok(
    !image.variants.some((variant) => variant.width === 320),
    `Portfolio image ${image.id} must not generate an unused 320 px variant`,
  )
}

assert.deepEqual(
  snapshot.images
    .get('aZpRH4Gg')
    ?.variants.map((variant) => variant.width),
  [160, 240, 480, 640, 960, 1280],
)
assert.deepEqual(
  snapshot.images
    .get('kyQw7CXK')
    ?.variants.map((variant) => variant.width),
  [160, 240, 480, 640, 960, 1280, 1920, 2560],
)

console.log('Responsive image policy and generated variants passed')
