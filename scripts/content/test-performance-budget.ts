import assert from 'node:assert/strict'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const outputRoot = 'dist'
const assetsRoot = join(outputRoot, 'assets')
const assetNames = await readdir(assetsRoot)

function hashedAsset(stem: string, extension: string): string {
  const matches = assetNames.filter(
    (name) => name.startsWith(`${stem}-`) && name.endsWith(extension),
  )
  assert.equal(matches.length, 1, `expected one ${stem}-*${extension}`)
  return matches[0]
}

async function gzipSize(name: string): Promise<number> {
  return gzipSync(await readFile(join(assetsRoot, name))).byteLength
}

const entryHtml = await readFile(join(outputRoot, 'index.html'), 'utf8')
const entryMatch = entryHtml.match(
  /<script type="module"[^>]+src="\/assets\/([^"]+\.js)"/,
)
assert.ok(entryMatch, 'production HTML must reference the entry module')
const entry = entryMatch[1]
const card = hashedAsset('HomePage', '.js')
const contact = hashedAsset('ContactInfoPage', '.js')
const portfolio = hashedAsset('PortfolioPage', '.js')
const entryText = await readFile(join(assetsRoot, entry), 'utf8')

assert.ok(
  (await gzipSize(entry)) <= 145 * 1024,
  'initial application entry must stay at or below 145 KiB gzip',
)
assert.ok(
  (await gzipSize(card)) <= 10 * 1024,
  'Card route chunk must stay at or below 10 KiB gzip',
)
assert.ok(
  (await gzipSize(contact)) <= 10 * 1024,
  'Contact route chunk must stay at or below 10 KiB gzip',
)
assert.ok(
  (await gzipSize(portfolio)) <= 10 * 1024,
  'Portfolio route chunk must stay at or below 10 KiB gzip',
)
assert.doesNotMatch(
  entryText,
  /StorePage-|ArtworkViewer-/,
  'unfinished routes must not enter the shared application bundle',
)
assert.doesNotMatch(
  entryHtml,
  /\/content\/images\/portrait\//,
  'The shared HTML shell must not preload Card-specific images',
)

const signaturePath = join(
  outputRoot,
  'content/images/signature/original.svg',
)
assert.ok(
  (await stat(signaturePath)).size <= 12 * 1024,
  'signature SVG must stay at or below 12 KiB',
)
assert.ok(
  (await stat(
    join(outputRoot, 'content/images/portrait/original.jpg'),
  )).size <= 64 * 1024,
  'portrait master JPEG must stay at or below 64 KiB',
)
assert.ok(
  (await stat(
    join(outputRoot, 'content/images/portrait/240.webp'),
  )).size <= 10 * 1024,
  '240 px portrait WebP must stay at or below 10 KiB',
)
assert.ok(
  (await stat(
    join(outputRoot, 'content/images/portrait/320.jpg'),
  )).size <= 25 * 1024,
  'vCard portrait JPEG must stay at or below 25 KiB',
)
console.log(
  'Card performance budgets passed · ' +
    `${Math.round((await gzipSize(entry)) / 1024)} KiB entry gzip`,
)
