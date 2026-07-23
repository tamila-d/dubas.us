import { ContentClient } from './ContentClient.ts'
import type { ContentLoadOptions } from '../http.ts'
import {
  ImageResourceValidationError,
  validateImageResource,
  type ImageResource,
} from '../image-resource.ts'
import { contentUrl } from '../urls.ts'

export class ImagesClient {
  private readonly contentClient: ContentClient

  constructor(contentClient = new ContentClient()) {
    this.contentClient = contentClient
  }

  async get(
    id: string,
    options: ContentLoadOptions = {},
  ): Promise<ImageResource> {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      throw new ImageResourceValidationError(
        'Image id must be lowercase and URL-safe',
      )
    }
    const value = await this.contentClient.getJson(
      contentUrl(`images/${id}/data.json`),
      options,
    )
    return validateImageResource(value, id)
  }

  invalidate(id: string): void {
    this.contentClient.invalidate(contentUrl(`images/${id}/data.json`))
  }
}
