import { difference, uniq } from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_STATE,
  ASSET_TYPE,
  PUBLISH_STATE,
  USER_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  ArticleRevisionContentInvalidError,
  ArticleRevisionReachLimitError,
  AssetNotFoundError,
  AuthenticationError,
  EntityNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
} from 'common/errors'
import {
  countWords,
  fromGlobalId,
  makeSummary,
  measureDiffs,
  sanitize,
  stripClass,
  stripHtml,
} from 'common/utils'
import { revisionQueue } from 'connectors/queue'
import { ItemData, MutationToEditArticleResolver } from 'definitions'

const resolver: MutationToEditArticleResolver = async (
  _,
  { input: { id, state, sticky, tags, content, cover, collection } },
  {
    viewer,
    dataSources: {
      draftService,
      systemService,
      articleService,
      tagService,
      notificationService,
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  // checks
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.baseFindById(dbId)
  if (!article) {
    throw new EntityNotFoundError('article does not exist')
  }
  const currDraft = await draftService.baseFindById(article.draftId)
  if (!currDraft) {
    throw new EntityNotFoundError('article linked draft does not exist')
  }
  if (currDraft.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }
  if (article.state !== ARTICLE_STATE.active) {
    throw new ForbiddenError('only active article is allowed to be edited.')
  }

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
    const tagEditors = environment.mattyId
      ? [environment.mattyId, article.authorId]
      : [article.authorId]

    // create tag records
    const dbTags = ((await Promise.all(
      uniq(
        tags.map((tag: string) =>
          tagService.create({
            content: tag,
            creator: article.authorId,
            editors: tagEditors,
            owner: article.authorId,
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
   * Cover
   */
  if (cover) {
    const asset = await systemService.findAssetByUUID(cover)

    if (
      !asset ||
      [ASSET_TYPE.embed, ASSET_TYPE.cover].indexOf(asset.type) < 0 ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('article cover does not exists')
    }

    await articleService.baseUpdate(dbId, {
      cover: asset.id,
      updatedAt: new Date(),
    })
  } else if (cover === null) {
    await articleService.baseUpdate(dbId, {
      cover: null,
      updatedAt: new Date(),
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

    // revise content
    if (content) {
      const revisionCount = await draftService.countValidByArticleId({
        articleId: article.id,
      })
      // cannot have drafts more than first draft plus 2 pending or published revision
      if (revisionCount > 3) {
        throw new ArticleRevisionReachLimitError(
          'number of revisions reach limit'
        )
      }

      const cleanedContent = stripClass(content, 'u-area-disable')

      // check diff distances reaches limit or not
      const diffs = measureDiffs(
        stripHtml(currDraft.content, ''),
        stripHtml(cleanedContent, '')
      )
      if (diffs > 50) {
        throw new ArticleRevisionContentInvalidError('revised content invalid')
      }

      // fetch updated data before create draft
      const [currArticle, currCollections, currTags] = await Promise.all([
        articleService.baseFindById(dbId),
        articleService.findCollections({ entranceId: article.id, limit: null }),
        tagService.findByArticleId({ articleId: article.id }),
      ])
      const currTagContents = currTags.map((currTag) => currTag.content)
      const currCollectionIds = currCollections.map(
        ({ articleId }: { articleId: string }) => articleId
      )

      // create draft linked to this article
      const data: ItemData = {
        uuid: v4(),
        authorId: currDraft.authorId,
        articleId: currArticle.id,
        title: currDraft.title,
        summary: makeSummary(cleanedContent),
        content: sanitize(cleanedContent),
        tags: currTagContents,
        cover: currArticle.cover,
        collection: currCollectionIds,
        wordCount: countWords(cleanedContent),
        archived: false,
        publishState: PUBLISH_STATE.pending,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const revisedDraft = await draftService.baseCreate(data)

      // add job to publish queue
      revisionQueue.publishRevisedArticle({ draftId: revisedDraft.id })
    }

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
  const node = await draftService.baseFindById(article.draftId)
  return node
}

export default resolver
