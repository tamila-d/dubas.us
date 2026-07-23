import { CardClient } from './clients/CardClient.ts'
import type { ContentLoadOptions } from './http.ts'
import type { CardContent } from './card-types.ts'

const cardClient = new CardClient()

export function loadCardContent(
  options: ContentLoadOptions = {},
): Promise<CardContent> {
  return cardClient.get(options)
}
