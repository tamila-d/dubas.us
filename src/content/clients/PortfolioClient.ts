import { ContentClient } from './ContentClient.ts'
import { ImagesClient } from './ImagesClient.ts'
import type { ContentLoadOptions } from '../http.ts'
import { imageResourceToResponsiveData } from '../image-resource.ts'
import {
  PortfolioResourceValidationError,
  validatePortfolioCropBounds,
  validatePortfolioCatalogResource,
  validatePortfolioItemResource,
  type PortfolioIndexResource,
  type PortfolioItemDetailResource,
  type PortfolioItemResource,
} from '../portfolio-resource.ts'
import { contentUrl } from '../urls.ts'

function portfolioItemUrl(id: string): string {
  if (!/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/.test(id)) {
    throw new Error('Portfolio id must be alphanumeric and URL-safe')
  }
  return contentUrl(`portfolio/${id}/data.json`)
}

export class PortfolioClient {
  private readonly contentClient: ContentClient
  private readonly imagesClient: ImagesClient

  constructor(contentClient = new ContentClient()) {
    this.contentClient = contentClient
    this.imagesClient = new ImagesClient(contentClient)
  }

  async getIndex(
    options: ContentLoadOptions = {},
  ): Promise<PortfolioIndexResource> {
    const catalog = validatePortfolioCatalogResource(
      await this.contentClient.getJson(
        contentUrl('portfolio/data.json'),
        options,
      ),
    )
    const items = await Promise.all(
      catalog.items.map(async ({ id, group }) => {
        const item = await this.getItem(id, options)
        if (item.type !== group) {
          throw new PortfolioResourceValidationError(
            `Portfolio item ${id} must belong to group "${group}"`,
          )
        }
        const image = await this.imagesClient.get(item.image, options)
        validatePortfolioCropBounds(
          item.crop,
          image.width,
          image.height,
        )
        return {
          id: item.id,
          title: item.title,
          location: item.location,
          createdAt: item.createdAt,
          type: group,
          availableForPurchase: item.availableForPurchase,
          commissioned: item.commissioned,
          crop: item.crop,
          image: imageResourceToResponsiveData(image),
        }
      }),
    )

    return {
      schemaVersion: 1,
      items,
    }
  }

  async getItem(
    id: string,
    options: ContentLoadOptions = {},
  ): Promise<PortfolioItemResource> {
    const value = await this.contentClient.getJson(
      portfolioItemUrl(id),
      options,
    )
    return validatePortfolioItemResource(value, id)
  }

  async getDetail(
    id: string,
    options: ContentLoadOptions = {},
  ): Promise<PortfolioItemDetailResource> {
    const item = await this.getItem(id, options)
    const image = await this.imagesClient.get(item.image, options)
    validatePortfolioCropBounds(
      item.crop,
      image.width,
      image.height,
    )

    return {
      item,
      image: {
        ...imageResourceToResponsiveData(image),
        original: image.original,
      },
    }
  }

  invalidate(id?: string): void {
    if (id === undefined) {
      this.contentClient.invalidate()
      return
    }
    this.contentClient.invalidate(portfolioItemUrl(id))
  }
}
