import DataLoader from 'dataloader'

import { BaseService } from 'connectors'
// import { getLogger } from 'common/logger'

// const logger = getLogger('service-collection')

export class CollectionService extends BaseService {
  constructor() {
    super('collection')
    this.dataloader = new DataLoader(this.baseFindByIds)
  }

  public createCollection = async ({
    title,
    authorId,
    description,
    cover,
  }: {
    title: string
    authorId: string
    description?: string
    cover?: string
  }) =>
    this.baseCreate({
      title,
      authorId,
      cover,
      description,
    })

  public updateCollection = async (
    id: string,
    {
      title,
      cover,
      description,
    }: {
      title?: string
      cover?: string
      description?: string
    }
  ) => this.baseUpdate(id, { title, cover, description })
}
