import { difference, uniq } from 'lodash'

import { ARTICLE_STATE, CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import {
  AuthenticationError,
  EntityNotFoundError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToEditArticleResolver } from 'definitions'

const resolver: MutationToEditArticleResolver = async (
  _,
  { input: { id, state, sticky, tags, collection } },
  {
    viewer,
    dataSources: {
      userService,
      articleService,
      tagService,
      notificationService,
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // checks
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new EntityNotFoundError('article does not exist')
  }
  if (article.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }
  if (article.state !== ARTICLE_STATE.active) {
    throw new ForbiddenError('only active article is allowed to be edited.')
  }

  // cache
  const purgeCache: {
    [CACHE_KEYWORD]: Array<{ id: string; type: string }>
  } = { [CACHE_KEYWORD]: [] }

  /**
   * Archive
   */
  if (state && state !== ARTICLE_STATE.archived) {
    throw new ForbiddenError(
      `"state" only supports "${ARTICLE_STATE.archived}".`
    )
  }
  if (state === ARTICLE_STATE.archived) {
    await articleService.archive(dbId)

    purgeCache[CACHE_KEYWORD].push(
      {
        id: article.id,
        type: NODE_TYPES.article,
      },
      {
        id: article.authorId,
        type: NODE_TYPES.user,
      }
    )
  }

  /**
   * Sticky
   */
  if (typeof sticky === 'boolean') {
    // reset if there are some sticky articles.
    if (sticky === true) {
      const stickyIds = (
        await articleService.findBySticky(viewer.id, true)
      ).map(({ id: articleId }) => articleId)
      await articleService.baseBatchUpdate(stickyIds, {
        sticky: false,
        updatedAt: new Date(),
      })
    }

    await articleService.baseUpdate(dbId, {
      sticky,
      updatedAt: new Date(),
    })
  }

  /**
   * Tags
   */
  if (tags) {
    // get tag editor
    const mattyUser = await userService.findByEmail('hi@matters.news')
    const tagEditors = mattyUser
      ? [mattyUser.id, article.authorId]
      : [article.authorId]

    // create tag records
    const dbTags = ((await Promise.all(
      uniq(
        tags.map((tag: string) =>
          tagService.create({
            content: tag,
            creator: article.authorId,
            editors: tagEditors,
          })
        )
      )
    )) as unknown) as [{ id: string; content: string }]

    const newIds = dbTags.map(({ id: tagId }) => tagId)
    const oldIds = (
      await tagService.findByArticleId({ articleId: article.id })
    ).map(({ id: tagId }: { id: string }) => tagId)

    // add
    await tagService.createArticleTags({
      articleIds: [article.id],
      creator: article.authorId,
      tagIds: difference(newIds, oldIds),
    })

    // delete unwanted
    await tagService.deleteArticleTagsByTagIds({
      articleId: article.id,
      tagIds: difference(oldIds, newIds),
    })
  }

  /**
   * Collection
   */
  if (collection) {
    // compare new and old collections
    const oldIds = (
      await articleService.findCollections({
        entranceId: article.id,
        limit: null,
      })
    ).map(({ articleId }: { articleId: string }) => articleId)
    const newIds = uniq(
      collection.map((articleId) => fromGlobalId(articleId).id)
    )
    const addItems: any[] = []
    const updateItems: any[] = []
    const diff = difference(newIds, oldIds)

    // gather data
    newIds.map((articleId: string, index: number) => {
      const indexOf = oldIds.indexOf(articleId)
      if (indexOf < 0) {
        addItems.push({ entranceId: article.id, articleId, order: index })
      }
      if (indexOf >= 0 && index !== indexOf) {
        updateItems.push({ entranceId: article.id, articleId, order: index })
      }
    })

    // add and update
    await Promise.all([
      ...addItems.map((data: any) => articleService.insertCollection(data)),
      ...updateItems.map((data: any) =>
        articleService.updateCollectionOrder(data)
      ),
    ])

    // delete unwanted
    await articleService.deleteCollectionByArticleIds({
      entranceId: article.id,
      articleIds: difference(oldIds, newIds),
    })

    // trigger notifications
    diff.forEach(async (articleId) => {
      const targetCollection = await articleService.baseFindById(articleId)
      notificationService.trigger({
        event: 'article_new_collected',
        recipientId: targetCollection.authorId,
        actorId: article.authorId,
        entities: [
          {
            type: 'target',
            entityTable: 'article',
            entity: targetCollection,
          },
          {
            type: 'collection',
            entityTable: 'article',
            entity: article,
          },
        ],
      })
    })
  }

  /**
   * Result
   */
  const newArticle = await articleService.baseFindById(dbId)
  Object.assign(newArticle, purgeCache)
  return newArticle
}

export default resolver
