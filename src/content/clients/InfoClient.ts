import { ContentClient } from './ContentClient.ts'
import type { ContentLoadOptions } from '../http.ts'
import {
  validateInfoResource,
  type InfoResource,
} from '../info-resource.ts'

const INFO_URL = '/content/info/data.json'

export class InfoClient {
  private readonly contentClient: ContentClient

  constructor(contentClient = new ContentClient()) {
    this.contentClient = contentClient
  }

  async get(
    options: ContentLoadOptions = {},
  ): Promise<InfoResource> {
    return validateInfoResource(
      await this.contentClient.getJson(INFO_URL, options),
    )
  }

  invalidate(): void {
    this.contentClient.invalidate(INFO_URL)
  }
}
