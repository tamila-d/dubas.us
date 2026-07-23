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

const entry = hashedAsset('index', '.js')
const card = hashedAsset('HomePage', '.js')
const entryHtml = await readFile(join(outputRoot, 'index.html'), 'utf8')
const entryText = await readFile(join(assetsRoot, entry), 'utf8')

assert.ok(
  (await gzipSize(entry)) <= 145 * 1024,
  'initial application entry must stay at or below 145 KiB gzip',
)
assert.ok(
  (await gzipSize(card)) <= 10 * 1024,
  'Card route chunk must stay at or below 10 KiB gzip',
)
assert.doesNotMatch(
  entryText,
  /PortfolioPage-|StorePage-|ArtworkViewer-/,
  'unfinished catalog routes must not enter the Card bundle',
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
    join(outputRoot, 'content/images/portrait/320.webp'),
  )).size <= 10 * 1024,
  '320 px portrait WebP must stay at or below 10 KiB',
)
assert.ok(
  (await stat(
    join(outputRoot, 'content/images/portrait/640.webp'),
  )).size <= 25 * 1024,
  '640 px portrait WebP must stay at or below 25 KiB',
)

console.log(
  'Card performance budgets passed · ' +
    `${Math.round((await gzipSize(entry)) / 1024)} KiB entry gzip`,
)
