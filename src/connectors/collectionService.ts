import DataLoader from 'dataloader'

import { BaseService } from 'connectors'
// import { getLogger } from 'common/logger'

// const logger = getLogger('service-collection')
//
interface Collection {
  id: string
  title: string
  authorId: string
  description?: string
  cover?: string
}

export class CollectionService extends BaseService {
  public constructor() {
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

  public findAndCountCollectionsByUser = async (
    id: string,
    { skip, take }: { skip?: number; take?: number }
  ): Promise<[Collection[], number]> => {
    const records = await this.baseFind({
      where: { authorId: id },
      skip,
      take,
      returnTotalCount: true,
    })
    const totalCount = records.length === 0 ? 0 : +records[0].totalCount
    return [records, totalCount]
  }

  public deleteCollections = async (
    ids: readonly string[],
    authorId: string
  ): Promise<boolean> => {
    if (ids.length === 0) {
      return false
    }
    const result = await this.knex('collection')
      .whereIn('id', ids)
      .andWhere('author_id', authorId)
      .del()
    return result > 0
  }
}
