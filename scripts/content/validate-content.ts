import { resolve } from 'node:path'
import { contentUrl } from '../../src/content/urls.ts'
import { scanContent } from './pipeline.ts'

const contentRoot = resolve(process.cwd(), 'content')
const snapshot = await scanContent(contentRoot)

if (
  contentUrl('images/portrait/data.json') !==
  '/content/images/portrait/data.json'
) {
  throw new Error('Root content URL contract is broken')
}

console.log(
  [
    'Content validation passed',
    'Static author content',
    `${snapshot.images.size} image resources`,
    `${snapshot.portfolio.size} portfolio works`,
    `${snapshot.publicFiles.size} public files`,
  ].join(' · '),
)
