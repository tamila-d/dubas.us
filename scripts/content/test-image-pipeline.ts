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
const removedCandidate = join(portraitDirectory, '320.webp')
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
  [320, 640],
)
assert.ok(
  portrait.variants.every((variant) =>
    variant.sources.length === 1 &&
    variant.sources[0]?.type === 'image/webp' &&
    variant.sources[0].url.startsWith('/content/images/portrait/'),
  ),
)
await assert.rejects(() => access(retiredCache))

console.log('Card image resource and responsive variant checks passed')
