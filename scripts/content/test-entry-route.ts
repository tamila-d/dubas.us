import assert from 'node:assert/strict'
import { entryRouteForDevice } from '../../src/app/router/entryRoute.ts'

assert.equal(
  entryRouteForDevice({
    mobileClientHint: true,
    userAgent: 'client-hint-phone',
  }),
  '/card',
)
assert.equal(
  entryRouteForDevice({
    mobileClientHint: false,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)',
  }),
  '/originals',
)
assert.equal(
  entryRouteForDevice({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  }),
  '/card',
)
assert.equal(
  entryRouteForDevice({
    userAgent:
      'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/138.0 Mobile Safari/537.36',
  }),
  '/card',
)
assert.equal(
  entryRouteForDevice({
    userAgent:
      'Mozilla/5.0 (Linux; Android 15; Pixel Tablet) AppleWebKit/537.36 Chrome/138.0 Safari/537.36',
  }),
  '/originals',
)
assert.equal(
  entryRouteForDevice({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  }),
  '/originals',
)

console.log('Root device routing checks passed')
