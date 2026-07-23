import { resolve } from 'node:path'
import { generateContentImages } from './image-pipeline.ts'

const result = await generateContentImages(resolve(process.cwd(), 'content'))

console.log(
  [
    'Responsive images ready',
    `${result.images} sources`,
    `${result.generated} generated files`,
  ].join(' · '),
)
