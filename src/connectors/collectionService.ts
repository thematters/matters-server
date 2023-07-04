import DataLoader from 'dataloader'
import { Knex } from 'knex'

import { ARTICLE_STATE } from 'common/enums'
import {
  ForbiddenError,
  EntityNotFoundError,
  ServerError,
  UserInputError,
} from 'common/errors'
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

interface CollectionArticle {
  articleId: string
  draftId: string
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
  ) =>
    this.baseUpdate(id, {
      title,
      cover,
      description,
      updatedAt: this.knex.fn.now(),
    })

  public findAndCountCollectionsByUser = async (
    id: string,
    { skip, take }: { skip?: number; take?: number }
  ): Promise<[Collection[], number]> => {
    const records = await this.baseFind({
      where: { authorId: id },
      orderBy: [{ column: 'updated_at', order: 'desc' }],
      skip,
      take,
      returnTotalCount: true,
    })
    const totalCount = records.length === 0 ? 0 : +records[0].totalCount
    return [records, totalCount]
  }

  public findAndCountArticlesInCollection = async (
    collectionId: string,
    {
      skip,
      take,
      reversed = true,
    }: { skip?: number; take?: number; reversed?: boolean }
  ): Promise<[CollectionArticle[], number]> => {
    const records = await this.knex('collection_article')
      .select(
        'article_id',
        'draft_id',
        'order',
        this.knex.raw('count(1) OVER() AS total_count')
      )
      .innerJoin('article', 'article.id', 'article_id')
      .where({ collectionId, state: ARTICLE_STATE.active })
      .orderBy('order', reversed ? 'desc' : 'asc')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
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
    const collections = await this.findByIds(ids)

    for (const collection of collections) {
      if (!collection) {
        throw new EntityNotFoundError('Collection not found')
      }
      if (collection instanceof Error) {
        throw new ServerError('Load collection error')
      }
      if (collection.authorId !== authorId) {
        throw new ForbiddenError('Author id not match')
      }
    }

    await this.knex('collection_article').whereIn('collection_id', ids).del()
    const result = await this.knex('collection')
      .whereIn('id', ids)
      .andWhere('author_id', authorId)
      .del()
    return result > 0
  }

  public deleteCollectionArticles = async (
    collectionId: string,
    articleIds: readonly string[]
  ) => {
    await this.knex('collection_article')
      .where('collection_id', collectionId)
      .whereIn('article_id', articleIds)
      .del()
    await this.baseUpdate(collectionId, { updatedAt: this.knex.fn.now() })
  }

  public findById = async (id: string) => await this.dataloader.load(id)

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
    await this.baseUpdate(collectionId, { updatedAt: this.knex.fn.now() })
  }

  public reorderArticles = async (
    collectionId: string,
    moves: Array<{ articleId: string; newPosition: number }>
  ) => {
    const [collectionArticles, count] =
      await this.findAndCountArticlesInCollection(collectionId, {})

    if (
      moves.some(({ newPosition }) => newPosition < 0 || newPosition >= count)
    ) {
      throw new UserInputError('Invalid newPosition')
    }

    const articleIds = collectionArticles.map(({ articleId }) => articleId)
    if (moves.some(({ articleId }) => !articleIds.includes(articleId))) {
      throw new UserInputError('Invalid articleId')
    }

    await this.baseUpdate(collectionId, { updatedAt: this.knex.fn.now() })

    for (const { articleId, newPosition } of moves) {
      if (
        newPosition ===
        collectionArticles.findIndex(({ articleId: id }) => id === articleId)
      ) {
        continue
      } else if (newPosition === 0) {
        const order = parseFloat(collectionArticles[0].order) + 1
        await this.knex('collection_article')
          .update({ order })
          .where({ articleId, collectionId })
        const [article] = collectionArticles.splice(
          collectionArticles.findIndex(({ articleId: id }) => id === articleId),
          1
        )
        collectionArticles.unshift({ ...article, order: order.toString() })
      } else if (newPosition === count - 1) {
        const lastOrder = parseFloat(collectionArticles[count - 1].order)
        const order = lastOrder / 2
        await this.knex('collection_article')
          .update({ order })
          .where({ articleId, collectionId })
        const [article] = collectionArticles.splice(
          collectionArticles.findIndex(({ articleId: id }) => id === articleId),
          1
        )
        collectionArticles.push({ ...article, order: order.toString() })
      } else {
        const prevOrder = parseFloat(collectionArticles[newPosition].order)
        const nextOrder = parseFloat(collectionArticles[newPosition + 1].order)
        const order = (prevOrder + nextOrder) / 2
        await this.knex('collection_article')
          .update({ order })
          .where({ articleId, collectionId })
        const [article] = collectionArticles.splice(
          collectionArticles.findIndex(({ articleId: id }) => id === articleId),
          1
        )
        collectionArticles.splice(newPosition, 0, {
          ...article,
          order: order.toString(),
        })
      }
    }
  }
}
