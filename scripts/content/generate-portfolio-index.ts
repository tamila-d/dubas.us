import { resolve } from 'node:path'
import { generatePortfolioIndex } from './portfolio-index.ts'

const result = await generatePortfolioIndex(resolve(process.cwd(), 'content'))

console.log(
  [
    'Portfolio index ready',
    `${result.items} items`,
    result.newest === undefined ? undefined : `newest ${result.newest}`,
    result.oldest === undefined ? undefined : `oldest ${result.oldest}`,
    result.changed ? 'updated' : 'unchanged',
  ]
    .filter((value) => value !== undefined)
    .join(' · '),
)
