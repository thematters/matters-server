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

interface CollectionAricle {
  id: string
  collectionId: string
  articleId: string
  order: string
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

  public findAndCountArticleInCollection = async (
    collectionId: string,
    { skip, take }: { skip?: number; take?: number }
  ): Promise<[CollectionAricle[], number]> => {
    const records = await this.baseFind({
      table: 'collection_article',
      where: { collectionId },
      orderBy: [{ column: 'order', order: 'desc' }],
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

  public findByIds = async (ids: readonly string[]) =>
    await this.dataloader.loadMany(ids)

  public addArticles = async (
    collectionId: string,
    articleIds: readonly string[]
  ) => {
    const res = await this.knex('collection_article')
      .where('collection_id', collectionId)
      .max('order')
    const initOrder = res[0].max ? parseFloat(res[0].max) + 1 : 1
    await this.knex('collection_article').insert(
      articleIds.map((articleId, index) => ({
        articleId,
        collectionId,
        order: initOrder + index,
      }))
    )
  }
}
