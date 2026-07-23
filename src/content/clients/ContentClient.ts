import {
  invalidateContentCache,
  requestContentJson,
  type ContentLoadOptions,
} from '../http.ts'

export class ContentClient {
  getJson(
    url: string,
    options: ContentLoadOptions = {},
  ): Promise<unknown> {
    return requestContentJson(url, options)
  }

  invalidate(url?: string): void {
    invalidateContentCache(url)
  }
}
