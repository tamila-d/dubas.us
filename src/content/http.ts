const requestCache = new Map<string, Promise<unknown>>()

export interface ContentLoadOptions {
  signal?: AbortSignal
}

export type ContentRequestErrorCode =
  | 'not-found'
  | 'http-error'
  | 'invalid-response'
  | 'network-error'

export class ContentRequestError extends Error {
  override name = 'ContentRequestError'
  readonly code: ContentRequestErrorCode
  readonly status: number | undefined

  constructor(
    code: ContentRequestErrorCode,
    message: string,
    status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.code = code
    this.status = status
  }
}

function abortError(): DOMException {
  return new DOMException('The content request was aborted', 'AbortError')
}

function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) {
    return promise
  }
  if (signal.aborted) {
    return Promise.reject(abortError())
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError())
    signal.addEventListener('abort', onAbort, { once: true })

    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

function startJsonRequest(url: string): Promise<unknown> {
  const cached = requestCache.get(url)
  if (cached !== undefined) {
    return cached
  }

  const request = fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'default',
  })
    .catch((error: unknown) => {
      throw new ContentRequestError(
        'network-error',
        'The content request could not be completed',
        undefined,
        { cause: error },
      )
    })
    .then(async (response) => {
      if (!response.ok) {
        throw new ContentRequestError(
          response.status === 404 ? 'not-found' : 'http-error',
          'The content request returned an error status',
          response.status,
        )
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        throw new ContentRequestError(
          'invalid-response',
          'The content response is not JSON',
          response.status,
        )
      }

      try {
        return (await response.json()) as unknown
      } catch (error) {
        throw new ContentRequestError(
          'invalid-response',
          'The content response contains invalid JSON',
          response.status,
          { cause: error },
        )
      }
    })
    .catch((error: unknown) => {
      requestCache.delete(url)
      throw error
    })

  requestCache.set(url, request)
  return request
}

export function requestContentJson(
  url: string,
  options: ContentLoadOptions = {},
): Promise<unknown> {
  if (options.signal?.aborted === true) {
    return Promise.reject(abortError())
  }

  return withAbort(startJsonRequest(url), options.signal)
}

export function invalidateContentCache(url?: string): void {
  if (url === undefined) {
    requestCache.clear()
    return
  }

  requestCache.delete(url)
}
