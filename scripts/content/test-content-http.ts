import assert from 'node:assert/strict'
import {
  ContentRequestError,
  invalidateContentCache,
  requestContentJson,
} from '../../src/content/http.ts'

const originalFetch = globalThis.fetch
const pending: Array<(response: Response) => void> = []
const requestOptions: Array<RequestInit | undefined> = []
let calls = 0

globalThis.fetch = ((_input, init) => {
  calls += 1
  requestOptions.push(init)
  return new Promise<Response>((resolve) => pending.push(resolve))
}) as typeof fetch

try {
  const sharedUrl = '/content/test/shared.json'
  const controller = new AbortController()
  const abortedConsumer = requestContentJson(sharedUrl, {
    signal: controller.signal,
  })
  const survivingConsumer = requestContentJson(sharedUrl)

  assert.equal(calls, 1, 'concurrent consumers must share one fetch')
  assert.deepEqual(requestOptions[0]?.headers, {
    Accept: 'application/json',
  })
  assert.equal(requestOptions[0]?.cache, 'default')

  controller.abort()
  await assert.rejects(
    abortedConsumer,
    (error: unknown) =>
      error instanceof DOMException && error.name === 'AbortError',
  )

  pending[0]?.(Response.json({ version: 1 }))
  assert.deepEqual(await survivingConsumer, { version: 1 })
  assert.deepEqual(await requestContentJson(sharedUrl), { version: 1 })
  assert.equal(calls, 1, 'resolved content must remain in the memory cache')

  invalidateContentCache(sharedUrl)
  const refreshed = requestContentJson(sharedUrl)
  assert.equal(calls, 2)
  pending[1]?.(Response.json({ version: 2 }))
  assert.deepEqual(await refreshed, { version: 2 })

  const retryUrl = '/content/test/retry.json'
  const failed = requestContentJson(retryUrl)
  pending[2]?.(
    new Response('Unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    }),
  )
  await assert.rejects(
    failed,
    (error: unknown) =>
      error instanceof ContentRequestError && error.code === 'http-error',
  )

  const retried = requestContentJson(retryUrl)
  assert.equal(calls, 4, 'failed requests must be evicted before retry')
  pending[3]?.(Response.json({ recovered: true }))
  assert.deepEqual(await retried, { recovered: true })

  console.log('Content request cache, deduplication and abort checks passed')
} finally {
  globalThis.fetch = originalFetch
  invalidateContentCache()
}
