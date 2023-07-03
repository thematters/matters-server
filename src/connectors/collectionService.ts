import DataLoader from 'dataloader'
import { Knex } from 'knex'

import { ARTICLE_STATE, MAX_PINNED_WORKS_LIMIT } from 'common/enums'
import {
  ForbiddenError,
  EntityNotFoundError,
  ServerError,
  UserInputError,
  ActionLimitExceededError,
} from 'common/errors'
import { BaseService, UserService } from 'connectors'
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

  public loadById = async (id: string) => await this.dataloader.load(id)

  public loadByIds = async (ids: readonly string[]) =>
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

  public createCollection = async ({
    title,
    authorId,
    description,
    cover,
    pinned,
  }: {
    title: string
    authorId: string
    description?: string
    cover?: string
    pinned?: boolean
  }) =>
    this.baseCreate({
      title,
      authorId,
      cover,
      description,
      pinned,
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

  /**
   * Delete collections and articles in those collections
   */
  public deleteCollections = async (
    ids: readonly string[],
    authorId: string
  ): Promise<boolean> => {
    if (ids.length === 0) {
      return false
    }
    const collections = await this.loadByIds(ids)

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
  ) =>
    await this.knex('collection_article')
      .where('collection_id', collectionId)
      .whereIn('article_id', articleIds)
      .del()

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

  /**
   * Update collection's pin status and return collection
   * Throw error if there already has 3 pinned articles/collections
   * or user is not the author of the article.
   */
  public updatePinned = async (
    collectionId: string,
    userId: string,
    pinned: boolean
  ) => {
    const collection = await this.loadById(collectionId)
    if (!collection) {
      throw new EntityNotFoundError('Collection not found')
    }
    if (collection.authorId !== userId) {
      throw new ForbiddenError('Only author can pin the article')
    }
    const userService = new UserService()
    const totalPinned = await userService.totalPinnedWorks(userId)
    if (pinned === collection.pinned) {
      return collection
    }
    if (pinned && totalPinned >= MAX_PINNED_WORKS_LIMIT) {
      throw new ActionLimitExceededError(
        `You can only pin up to ${MAX_PINNED_WORKS_LIMIT} articles/collections`
      )
    }
    await this.baseUpdate(collectionId, {
      pinned,
      pinnedAt: this.knex.fn.now(),
    })
    return { ...collection, pinned }
  }

  public findPinnedByAuthor = async (authorId: string) =>
    this.baseFind({ where: { authorId, pinned: true } })
}
