import type {
  Connections,
  Collection,
  Article,
  User,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  ARTICLE_STATE,
  MAX_PINNED_WORKS_LIMIT,
  USER_STATE,
  MAX_ARTICLES_PER_COLLECTION_LIMIT,
} from '#common/enums/index.js'
import {
  ForbiddenError,
  EntityNotFoundError,
  ArticleNotFoundError,
  ServerError,
  UserInputError,
  ActionLimitExceededError,
  ForbiddenByStateError,
} from '#common/errors.js'
import { selectWithTotalCount } from '#common/utils/index.js'

import { BaseService } from './baseService.js'
import { UserService } from './userService.js'
import { UserWorkService } from './userWorkService.js'

export class CollectionService extends BaseService<Collection> {
  public constructor(connections: Connections) {
    super('collection', connections)
  }

  public addArticles = async ({
    collectionId,
    articleIds,
    userId,
  }: {
    collectionId: string
    articleIds: readonly string[]
    userId: string
  }) => {
    const articles = await this.validateAddArticles({
      collectionId,
      articleIds,
      userId,
    })
    if (articles.length === 0) {
      return
    }
    const [{ max }] = await this.knexRO('collection_article')
      .where('collection_id', collectionId)
      .max('order')
    const initOrder = max ? parseFloat(max) + 1 : 1
    await this.knex('collection_article').insert(
      articles.map((article, index) => ({
        articleId: article.id,
        collectionId,
        order: initOrder + index,
      }))
    )
    // update timestamp
    this.models.update({
      table: 'collection',
      where: { id: collectionId },
      data: {},
    })
  }

  public removeArticles = async ({
    collectionId,
    articleIds,
  }: {
    collectionId: string
    articleIds: readonly string[]
  }) => {
    await this.knex('collection_article')
      .where('collection_id', collectionId)
      .whereIn('article_id', articleIds)
      .del()
  }

  public validateAddArticles = async ({
    collectionId,
    articleIds,
    userId,
  }: {
    collectionId: string
    articleIds: readonly string[]
    userId: string
  }) => {
    const originalArticles = await this.validateCollection({
      collectionId,
      newArticlesCount: articleIds.length,
      userId,
    })
    const originalArticleIds = originalArticles.map((a) => a.id)
    const duplicatedArticleIds = originalArticleIds.filter((id) =>
      articleIds.includes(id)
    )
    const articles: Article[] = []
    for (const articleId of articleIds) {
      if (duplicatedArticleIds.includes(articleId)) {
        continue
      }
      const article = await this.models.articleIdLoader.load(articleId)
      if (!article || article.state !== ARTICLE_STATE.active) {
        throw new ArticleNotFoundError('Article not found')
      }
      if (article.authorId !== userId) {
        throw new ForbiddenError('Viewer has no permission')
      }
      articles.push(article)
    }
    return articles
  }

  public validateCollection = async ({
    collectionId,
    newArticlesCount,
    userId,
  }: {
    collectionId: string
    newArticlesCount: number
    userId: string
  }) => {
    const collection = await this.models.collectionIdLoader.load(collectionId)
    if (!collection) {
      throw new EntityNotFoundError('Collection not found')
    }
    if (collection.authorId !== userId) {
      throw new ForbiddenError('Viewer has no permission')
    }
    const [articles, count] = await this.findAndCountArticlesInCollection(
      collectionId,
      {
        take: MAX_ARTICLES_PER_COLLECTION_LIMIT,
      }
    )
    if (count + newArticlesCount > MAX_ARTICLES_PER_COLLECTION_LIMIT) {
      throw new ActionLimitExceededError(
        `Collection ${collection.id} capacity exceeded`
      )
    }

    return articles
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
  ) =>
    this.baseUpdate(id, {
      title,
      cover,
      description,
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

  public findArticles = (collectionId: string) =>
    this.knexRO('collection_article')
      .select('order', 'article.*')
      .innerJoin('article', 'article.id', 'article_id')
      .where({ collectionId, state: ARTICLE_STATE.active })

  public findAndCountArticlesInCollection = async (
    collectionId: string,
    {
      skip,
      take,
      reversed = true,
    }: { skip?: number; take?: number; reversed?: boolean } = {}
  ): Promise<[Array<Article & { order: string }>, number]> => {
    const query = this.findArticles(collectionId)
    query
      .orderBy('order', reversed ? 'desc' : 'asc')
      .modify(selectWithTotalCount)
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })
    const records = await query
    return [records, records[0]?.totalCount || 0]
  }

  public containsArticle = async (collectionId: string, articleId: string) => {
    const res = await this.knex('collection_article')
      .where({ collectionId, articleId })
      .count()
      .first()
    return Number(res?.count) > 0
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
    const collections = await this.models.collectionIdLoader.loadMany(ids)

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

    await this.knex('action_collection').whereIn('target_id', ids).del()
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
    await this.baseUpdate(collectionId, {})
  }

  /**
   * Reorder articles in a collection
   * @param collectionId - The id of the collection
   * @param moves - The moves to be made, newPosition is 0-based and order by "order" desc
   * @returns void
   */
  public reorderArticles = async (
    collectionId: string,
    moves: Array<{ articleId: string; newPosition: number }>
  ) => {
    const [collectionArticles, count] =
      await this.findAndCountArticlesInCollection(collectionId)

    if (
      moves.some(({ newPosition }) => newPosition < 0 || newPosition >= count)
    ) {
      throw new UserInputError('Invalid newPosition')
    }

    const articleIds = collectionArticles.map(({ id }) => id)
    if (moves.some(({ articleId }) => !articleIds.includes(articleId))) {
      throw new UserInputError('Invalid articleId')
    }

    await this.baseUpdate(collectionId, {})

    for (const { articleId, newPosition } of moves) {
      if (
        newPosition ===
        collectionArticles.findIndex(({ id }) => id === articleId)
      ) {
        continue
      } else if (newPosition === 0) {
        const order = parseFloat(collectionArticles[0].order) + 1
        await this.knex('collection_article')
          .update({ order })
          .where({ articleId, collectionId })
        const [article] = collectionArticles.splice(
          collectionArticles.findIndex(({ id }) => id === articleId),
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
          collectionArticles.findIndex(({ id }) => id === articleId),
          1
        )
        collectionArticles.push({ ...article, order: order.toString() })
      } else {
        // first put aside the article to be moved
        const [article] = collectionArticles.splice(
          collectionArticles.findIndex(({ id }) => id === articleId),
          1
        )
        const prevOrder = parseFloat(collectionArticles[newPosition].order)
        const nextOrder = parseFloat(collectionArticles[newPosition - 1].order)
        const order = (prevOrder + nextOrder) / 2
        await this.knex('collection_article')
          .update({ order })
          .where({ articleId, collectionId })
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
    const collection = await this.models.collectionIdLoader.load(collectionId)
    if (!collection) {
      throw new EntityNotFoundError('Collection not found')
    }
    if (collection.authorId !== userId) {
      throw new ForbiddenError('Only author can pin the article')
    }
    const userWorkService = new UserWorkService(this.connections)
    const totalPinned = await userWorkService.totalPinnedWorks(userId)
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
      pinnedAt: this.knex.fn.now() as unknown as Date,
    })
    return { ...collection, pinned }
  }

  public findByAuthor = async (
    authorId: string,
    { skip, take }: { skip?: number; take?: number } = {},
    filterEmpty = false
  ): Promise<Collection[]> =>
    this.knexRO<Collection>('collection')
      .where({ authorId })
      .orderBy('updatedAt', 'desc')
      .modify((builder) => {
        if (filterEmpty) {
          builder.whereExists(
            this.knexRO('collection_article')
              .select(this.knex.raw(1))
              .whereRaw('collection.id = collection_article.collection_id')
          )
        }
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

  public findByArticle = (articleId: string) =>
    this.knexRO('collection_article')
      .select('collection.*')
      .innerJoin(
        'collection',
        'collection.id',
        'collection_article.collection_id'
      )
      .where({ articleId })

  public findPinnedByAuthor = async (authorId: string) =>
    this.models.findMany({
      table: 'collection',
      where: { authorId, pinned: true },
    })

  public like = async (
    collectionId: string,
    user: Pick<User, 'id' | 'state'>
  ) => {
    if (user.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${user.state} user is not allowed to like collections`
      )
    }
    const collection = await this.models.collectionIdLoader.load(collectionId)
    const userService = new UserService(this.connections)
    const isBlocked = await userService.blocked({
      userId: collection.authorId,
      targetId: user.id,
    })
    if (isBlocked) {
      throw new ForbiddenError(
        `user ${collectionId} is blocked by target author`
      )
    }
    return this.models.upsert({
      table: 'action_collection',
      where: { targetId: collectionId, userId: user.id },
      create: { targetId: collectionId, userId: user.id, action: 'like' },
      update: { updatedAt: new Date() },
    })
  }

  public unlike = async (collectionId: string, user: Pick<User, 'id'>) =>
    this.models.deleteMany({
      table: 'action_collection',
      where: { targetId: collectionId, userId: user.id, action: 'like' },
    })

  public isLiked = async (collectionId: string, userId: string) => {
    const count = await this.models.count({
      table: 'action_collection',
      where: { targetId: collectionId, userId: userId, action: 'like' },
    })
    return count > 0
  }

  public countLikes = async (collectionId: string) =>
    this.models.count({
      table: 'action_collection',
      where: { targetId: collectionId, action: 'like' },
    })
}
