import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { CardClient } from '../../src/content/clients/CardClient.ts'
import { ContentClient } from '../../src/content/clients/ContentClient.ts'

const originalFetch = globalThis.fetch
const requests: string[] = []
const responses = new Map<string, string>([
  [
    '/content/info/data.json',
    await readFile(resolve('content/info/data.json'), 'utf8'),
  ],
  [
    '/content/images/portrait/data.json',
    await readFile(
      resolve('content/images/portrait/data.json'),
      'utf8',
    ),
  ],
  [
    '/content/images/signature/data.json',
    await readFile(
      resolve('content/images/signature/data.json'),
      'utf8',
    ),
  ],
])

globalThis.fetch = (async (input) => {
  const url = String(input)
  requests.push(url)
  const body = responses.get(url)
  return body === undefined
    ? new Response('Not found', { status: 404 })
    : new Response(body, {
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })
}) as typeof fetch

const contentClient = new ContentClient()

try {
  const cardClient = new CardClient(contentClient)
  const card = await cardClient.get()

  assert.equal(card.info.artist.firstName, 'Tamila')
  assert.deepEqual(card.info.images, {
    portrait: 'portrait',
    signature: 'signature',
  })
  assert.deepEqual(
    card.portrait.card.sources
      .map((source) => source.width)
      .filter((width, index, widths) => widths.indexOf(width) === index),
    [320, 640],
  )
  assert.equal(
    card.portrait.card.fallback,
    '/content/images/portrait/640.webp',
    'Card fallback must not download the original portrait',
  )
  assert.ok(
    card.portrait.card.sources.every(
      (source) =>
        source.src !== '/content/images/portrait/original.jpg',
    ),
    'Card responsive sources must not include the original portrait',
  )
  assert.deepEqual(requests.sort(), [...responses.keys()].sort())

  await cardClient.get()
  assert.equal(
    requests.length,
    responses.size,
    'Card requests should share the content cache',
  )

  console.log('Parallel Card REST content client passed')
} finally {
  globalThis.fetch = originalFetch
  contentClient.invalidate()
}
