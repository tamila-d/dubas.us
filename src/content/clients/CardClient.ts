import { ContentClient } from './ContentClient.ts'
import { ImagesClient } from './ImagesClient.ts'
import { InfoClient } from './InfoClient.ts'
import type { CardContent } from '../card-types.ts'
import type { ContentLoadOptions } from '../http.ts'
import { imageResourceToResponsiveData } from '../image-resource.ts'

const portraitId = 'portrait'
const signatureId = 'signature'

export class CardClient {
  private readonly contentClient: ContentClient
  private readonly imagesClient: ImagesClient
  private readonly infoClient: InfoClient

  constructor(contentClient = new ContentClient()) {
    this.contentClient = contentClient
    this.imagesClient = new ImagesClient(contentClient)
    this.infoClient = new InfoClient(contentClient)
  }

  async get(
    options: ContentLoadOptions = {},
  ): Promise<CardContent> {
    const [info, portrait, signature] = await Promise.all([
      this.infoClient.get(options),
      this.imagesClient.get(portraitId, options),
      this.imagesClient.get(signatureId, options),
    ])

    if (
      info.images.portrait !== portrait.id ||
      info.images.signature !== signature.id
    ) {
      throw new Error('Card image references do not match image resources')
    }

    return {
      info,
      portrait: imageResourceToResponsiveData(portrait),
      signature,
    }
  }

  invalidate(): void {
    this.contentClient.invalidate()
  }
}
