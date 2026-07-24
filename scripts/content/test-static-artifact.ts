import assert from 'node:assert/strict'
import { access, readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { gzipSync } from 'node:zlib'

const outputRoot = 'dist'
const rootShell = await readFile(join(outputRoot, 'index.html'), 'utf8')
const scriptEnabledRootShell = rootShell.replace(
  /<noscript>[\s\S]*?<\/noscript>/g,
  '',
)

assert.match(rootShell, /(?:src|href)="\/assets\//)
assert.doesNotMatch(rootShell, /(?:src|href)="(?!\/|https?:|mailto:|#)/)
assert.match(rootShell, /id="app-boot"/)
assert.match(rootShell, /<title>Tamila Dubas<\/title>/)
assert.match(rootShell, /phone \? '\/card' : '\/portfolio'/)
assert.match(
  scriptEnabledRootShell,
  /<link rel="preload" as="style"[^>]* data-app-stylesheet /,
)
assert.doesNotMatch(
  scriptEnabledRootShell,
  /<link rel="stylesheet"[^>]* href="\/assets\//,
)
assert.match(
  scriptEnabledRootShell,
  /<script type="module"[^>]* src="\/assets\//,
)
assert.ok(
  gzipSync(rootShell).byteLength <= 2 * 1024,
  'HTML shell with the pre-React loader must stay below 2 KiB gzip',
)

const portfolioIndex = JSON.parse(
  await readFile(join(outputRoot, 'content/portfolio/data.json'), 'utf8'),
) as { items: Array<{ id: string }> }

for (const shell of [
  'card/index.html',
  'contact/index.html',
  'crop/index.html',
  'portfolio/index.html',
  ...portfolioIndex.items.map(
    ({ id }) => `crop/${id}/index.html`,
  ),
  ...portfolioIndex.items.map(
    ({ id }) => `portfolio/${id}/index.html`,
  ),
  '404.html',
]) {
  assert.equal(
    await readFile(join(outputRoot, shell), 'utf8'),
    rootShell,
    `${shell} must match the root shell`,
  )
}

await access(join(outputRoot, 'content/info/data.json'))
await access(
  join(outputRoot, 'content/images/portrait/data.json'),
)
await access(join(outputRoot, 'content/images/portrait/240.webp'))
await access(join(outputRoot, 'content/images/portrait/320.jpg'))
await assert.rejects(
  () => access(join(outputRoot, 'content/images/portrait/320.webp')),
)
await assert.rejects(
  () => access(join(outputRoot, 'content/images/portrait/480.webp')),
)
await access(
  join(outputRoot, 'content/images/signature/data.json'),
)
await access(join(outputRoot, 'content/portfolio/data.json'))
await access(
  join(outputRoot, 'content/portfolio/RgDKYZ9v/data.json'),
)
await access(
  join(outputRoot, 'content/images/RgDKYZ9v/640.webp'),
)
await assert.rejects(
  () => access(join(outputRoot, 'content/images/RgDKYZ9v/320.webp')),
)
await assert.rejects(
  () => access(join(outputRoot, 'content/images/RgDKYZ9v/1350.webp')),
)
await access(join(outputRoot, 'content/images/kyQw7CXK/1920.webp'))
await access(join(outputRoot, 'content/images/kyQw7CXK/2560.webp'))
await assert.rejects(() => access(join(outputRoot, 'content/store')))
await assert.rejects(() => access(join(outputRoot, 'content/pages')))

const robots = await readFile(join(outputRoot, 'robots.txt'), 'utf8')
assert.equal(robots, 'User-agent: *\nDisallow: /crop\n')

const favicon = await readFile(join(outputRoot, 'favicon.svg'), 'utf8')
assert.match(favicon, /<rect[^>]+fill="#000"/)
assert.match(favicon, /<path[^>]+fill="#fff"/)
assert.doesNotMatch(favicon, /<image|data:image\//)
assert.ok(
  Buffer.byteLength(favicon) <= 2 * 1024,
  'traced favicon must stay at or below 2 KiB',
)

async function textFiles(directory: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await textFiles(path)))
    } else if (/\.(?:css|html|js|json|svg)$/.test(entry.name)) {
      files.push(path)
    }
  }
  return files
}

for (const file of await textFiles(outputRoot)) {
  const text = await readFile(file, 'utf8')
  assert.doesNotMatch(
    text,
    /\/(?:artist-site|test-repo)\/|github\.io\/[^/]+|import\.meta\.env\.BASE_URL|CNAME/,
    `${relative(outputRoot, file)} contains a forbidden hosting prefix`,
  )
}

assert.equal((await stat(join(outputRoot, 'content'))).isDirectory(), true)

console.log('Static site artifact checks passed')
