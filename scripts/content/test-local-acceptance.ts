import assert from 'node:assert/strict'
import { access, readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'
import { scanContent } from './pipeline.ts'

const contentRoot = resolve('content')
const distContentRoot = resolve('dist/content')
const snapshot = await scanContent(contentRoot)

async function filesUnder(root: string): Promise<string[]> {
  const files: string[] = []
  async function walk(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        await walk(path)
      } else if (entry.isFile()) {
        files.push(relative(root, path).split(sep).join('/'))
      }
    }
  }
  await walk(root)
  return files.sort()
}

const sourceFiles = (await filesUnder(contentRoot)).filter(
  (path) => path !== 'README.md',
)
const distFiles = await filesUnder(distContentRoot)
const generatedFiles = Object.keys(snapshot.indexJson)
const expectedDistFiles = [...sourceFiles, ...generatedFiles].sort()
assert.deepEqual(distFiles, expectedDistFiles)

for (const path of sourceFiles) {
  assert.equal(
    (await readFile(join(contentRoot, path))).equals(
      await readFile(join(distContentRoot, path)),
    ),
    true,
    `dist/content/${path} differs from content/${path}`,
  )
}

assert.equal(snapshot.info.artist.firstName, 'Tamila')

const portfolioIndex = JSON.parse(
  await readFile(join(distContentRoot, 'portfolio/data.json'), 'utf8'),
) as { items: unknown[] }
assert.equal(snapshot.images.size, 16)
assert.equal(snapshot.portfolio.size, 14)
assert.equal(portfolioIndex.items.length, 14)
await assert.rejects(access(resolve('content/store')))
await assert.rejects(access(resolve('content/pages')))
await assert.rejects(access(resolve('CNAME')))
assert.equal((await stat(distContentRoot)).isDirectory(), true)

console.log(
  `Static content parity passed · ${distFiles.length} byte-identical files`,
)
