import { stripHtml } from '@matters/ipns-site-generator'
import lodash, { difference, flow, uniq } from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  ASSET_TYPE,
  CACHE_KEYWORD,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  MAX_ARTICLE_REVISION_COUNT,
  MAX_TAGS_PER_ARTICLE_LIMIT,
  NODE_TYPES,
  PUBLISH_STATE,
  USER_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  ArticleNotFoundError,
  ArticleRevisionContentInvalidError,
  ArticleRevisionReachLimitError,
  AssetNotFoundError,
  AuthenticationError,
  CircleNotFoundError,
  DraftNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  NotAllowAddOfficialTagError,
  TooManyTagsForArticleError,
  UserInputError,
} from 'common/errors'
import {
  correctHtml,
  fromGlobalId,
  measureDiffs,
  normalizeTagInput,
  sanitize,
  // stripAllPunct,
  stripClass,
} from 'common/utils'
import { publicationQueue, revisionQueue } from 'connectors/queue'
import { MutationToEditArticleResolver } from 'definitions'

const resolver: MutationToEditArticleResolver = async (
  _,
  {
    input: {
      id,
      state,
      sticky,
      tags,
      content,
      summary,
      cover,
      collection,
      circle: circleGlobalId,
      accessType,
      license,
      requestForDonation,
      replyToDonator,
      iscnPublish,
    },
  },
  {
    viewer,
    dataSources: {
      articleService,
      atomService,
      draftService,
      notificationService,
      systemService,
      tagService,
      userService,
    },
    knex,
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (!viewer.likerId) {
    throw new ForbiddenError('user has no liker id')
  }

  // checks
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.baseFindById(dbId)
  if (!article) {
    throw new ArticleNotFoundError('article does not exist')
  }
  const draft = await draftService.baseFindById(article.draftId)
  if (!draft) {
    throw new DraftNotFoundError('article linked draft does not exist')
  }
  if (draft.authorId !== viewer.id) {
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

    // refresh after archived any article
    const author = await userService.baseFindById(article.authorId)
    publicationQueue.refreshIPNSFeed({ userName: author.userName })
  }

  /**
   * Sticky
   */
  if (typeof sticky === 'boolean') {
    // reset if there are some sticky articles.
    if (sticky === true) {
      const stickyIds = (
        await atomService.findMany({
          table: 'article',
          where: { authorId: viewer.id, sticky: true },
        })
      ).map(({ id: articleId }: { id: string }) => articleId)
      await articleService.baseBatchUpdate(stickyIds, {
        sticky: false,
        updatedAt: knex.fn.now(),
      })
    }

    await articleService.baseUpdate(dbId, {
      sticky,
      updatedAt: knex.fn.now(),
    })
  }

  /**
   * Tags
   */
  const resetTags = tags === null || (tags && tags.length === 0)
  if (tags) {
    // get tag editor
    const tagEditors = environment.mattyId
      ? [environment.mattyId, article.authorId]
      : [article.authorId]

    // tags = uniq(tags.map(stripAllPunct).filter(Boolean))

    if (tags.length > MAX_TAGS_PER_ARTICLE_LIMIT) {
      throw new TooManyTagsForArticleError(
        `not allow more than ${MAX_TAGS_PER_ARTICLE_LIMIT} tags on an article`
      )
    }

    // create tag records
    const dbTags = (
      await Promise.all(
        // eslint-disable-next-line no-shadow
        // tslint:disable-next-line
        tags.filter(Boolean).map(async (content: string) =>
          tagService.create(
            {
              content,
              creator: article.authorId,
              editors: tagEditors,
              owner: article.authorId,
            },
            {
              columns: ['id', 'content'],
              skipCreate: normalizeTagInput(content) !== content, // || content.length > MAX_TAG_CONTENT_LENGTH,
            }
          )
        )
      )
    )
      // eslint-disable-next-line no-shadow
      // tslint:disable-next-line
      .map(({ id, content }) => ({ id: `${id}`, content })) as unknown as [
      { id: string; content: string }
    ]

    const newIds = dbTags.map(({ id: tagId }) => tagId)
    const oldIds = (
      await tagService.findByArticleId({ articleId: article.id })
    ).map(({ id: tagId }: { id: string }) => tagId)

    // check if add tags include matty's tag
    const mattyTagId = environment.mattyChoiceTagId || ''
    const isMatty = environment.mattyId === viewer.id
    const addIds = difference(newIds, oldIds)
    if (addIds.includes(mattyTagId) && !isMatty) {
      throw new NotAllowAddOfficialTagError('not allow to add official tag')
    }

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
  } else if (resetTags) {
    const oldIds = (
      await tagService.findByArticleId({ articleId: article.id })
    ).map(({ id: tagId }: { id: string }) => tagId)

    await tagService.deleteArticleTagsByTagIds({
      articleId: article.id,
      tagIds: oldIds,
    })
  }

  /**
   * Cover
   */
  const resetCover = cover === null
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
      updatedAt: knex.fn.now(),
    })
  } else if (resetCover) {
    await articleService.baseUpdate(dbId, {
      cover: null,
      updatedAt: knex.fn.now(),
    })
  }

  /**
   * Collection
   */
  const resetCollection =
    collection === null || (collection && collection.length === 0)
  if (collection) {
    // compare new and old collections
    const oldIds = (
      await articleService.findCollections({
        entranceId: article.id,
      })
    ).map(({ articleId }: { articleId: string }) => articleId)

    const newIds = uniq(
      (
        await Promise.all(
          collection.map(async (articleId) => {
            const articleDbId = fromGlobalId(articleId).id

            if (!articleDbId) {
              return
            }

            const collectedArticle = await atomService.findUnique({
              table: 'article',
              where: { id: articleDbId },
            })

            if (!collectedArticle) {
              throw new ArticleNotFoundError(`Cannot find article ${articleId}`)
            }

            if (collectedArticle.state !== ARTICLE_STATE.active) {
              throw new ForbiddenError(
                `Article ${articleId} cannot be collected.`
              )
            }

            const isBlocked = await userService.blocked({
              userId: collectedArticle.authorId,
              targetId: viewer.id,
            })

            if (isBlocked) {
              throw new ForbiddenError('viewer has no permission')
            }

            return articleDbId
          })
        )
      ).filter((articleId): articleId is string => !!articleId)
    )

    interface Item {
      entranceId: string
      articleId: string
      order: number
    }
    const addItems: Item[] = []
    const updateItems: Item[] = []
    const diff = difference(newIds, oldIds)

    // gather data
    newIds.forEach((articleId: string, index: number) => {
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
      ...addItems.map((item) =>
        atomService.create({
          table: 'collection',
          data: {
            ...item,
            // createdAt: new Date(),
            // updatedAt: knex.fn.now(),
          },
        })
      ),
      ...updateItems.map((item) =>
        atomService.update({
          table: 'collection',
          where: { entranceId: item.entranceId, articleId: item.articleId },
          data: { order: item.order, updatedAt: knex.fn.now() },
        })
      ),
    ])

    // delete unwanted
    await atomService.deleteMany({
      table: 'collection',
      where: { entranceId: article.id },
      whereIn: ['article_id', difference(oldIds, newIds)],
    })

    // trigger notifications
    diff.forEach(async (articleId) => {
      const targetCollection = await articleService.baseFindById(articleId)
      notificationService.trigger({
        event: DB_NOTICE_TYPE.article_new_collected,
        recipientId: targetCollection.authorId,
        actorId: article.authorId,
        entities: [
          { type: 'target', entityTable: 'article', entity: targetCollection },
          {
            type: 'collection',
            entityTable: 'article',
            entity: article,
          },
        ],
      })
    })
  } else if (resetCollection) {
    await atomService.deleteMany({
      table: 'collection',
      where: { entranceId: article.id },
    })
  }

  /**
   * Circle
   */
  const currAccess = await atomService.findFirst({
    table: 'article_circle',
    where: { articleId: article.id },
  })
  const resetCircle = currAccess && circleGlobalId === null
  let isUpdatingAccess = false
  let circle: any

  if (circleGlobalId) {
    const { id: circleId } = fromGlobalId(circleGlobalId)
    circle = await atomService.findFirst({
      table: 'circle',
      where: { id: circleId, state: CIRCLE_STATE.active },
    })

    if (!circle) {
      throw new CircleNotFoundError(`Cannot find circle ${circleGlobalId}`)
    } else if (circle.owner !== viewer.id) {
      throw new ForbiddenError(
        `Viewer isn't the owner of circle ${circleGlobalId}.`
      )
    } else if (circle.state !== CIRCLE_STATE.active) {
      throw new ForbiddenError(`Circle ${circleGlobalId} cannot be added.`)
    }

    if (!accessType) {
      throw new UserInputError('"accessType" is required on `circle`.')
    }

    if (
      circle.id !== currAccess?.circleId ||
      (circle.id === currAccess?.circleId && accessType !== currAccess?.access)
    ) {
      isUpdatingAccess = true
    }

    // insert to db
    const data = { articleId: article.id, circleId: circle.id }
    await atomService.upsert({
      table: 'article_circle',
      where: data,
      create: { ...data, access: accessType },
      update: { ...data, access: accessType, updatedAt: knex.fn.now() },
    })
  } else if (resetCircle) {
    await atomService.deleteMany({
      table: 'article_circle',
      where: { articleId: article.id },
    })
  }

  /**
   * Summary
   */
  const resetSummary = summary === null || summary === ''
  if (summary || resetSummary) {
    await atomService.update({
      table: 'draft',
      where: { id: article.draftId },
      data: {
        summary: summary || null,
        summaryCustomized: !!summary,
        updatedAt: knex.fn.now(),
      },
    })
  }

  /**
   * Revision Count
   */
  const isUpdatingContent = !!content
  const isUpdatingISCNPublish = iscnPublish != null // both null or omit (undefined)
  const isUpdatingCircleOrAccess = isUpdatingAccess || resetCircle
  const checkRevisionCount = () => {
    const revisionCount = article.revisionCount || 0
    if (revisionCount >= MAX_ARTICLE_REVISION_COUNT) {
      throw new ArticleRevisionReachLimitError(
        'number of revisions reach limit'
      )
    }
  }

  /**
   * License
   */
  if (license !== draft.license) {
    await atomService.update({
      table: 'draft',
      where: { id: article.draftId },
      data: {
        license: license || ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2,
        updatedAt: knex.fn.now(),
      },
    })
  }

  /**
   * Support settings
   */
  const isUpdatingRequestForDonation = !!requestForDonation
  const isUpdatingReplyToDonator = !!requestForDonation
  if (isUpdatingRequestForDonation || isUpdatingReplyToDonator) {
    await atomService.update({
      table: 'draft',
      where: { id: article.draftId },
      data: {
        requestForDonation,
        replyToDonator,
        updatedAt: knex.fn.now(),
      },
    })
  }

  /**
   * Republish article if content or access is changed
   */
  const republish = async (newContent?: string) => {
    checkRevisionCount()

    // fetch updated data before create draft
    const [
      currDraft,
      currArticle,
      currCollections,
      currTags,
      currArticleCircle,
    ] = await Promise.all([
      draftService.baseFindById(article.draftId), // fetch latest draft
      articleService.baseFindById(dbId), // fetch latest article
      articleService.findCollections({ entranceId: article.id }),
      tagService.findByArticleId({ articleId: article.id }),
      articleService.findArticleCircle(article.id),
    ])
    const currTagContents = currTags.map((currTag) => currTag.content)
    const currCollectionIds = currCollections.map(
      ({ articleId }: { articleId: string }) => articleId
    )

    // create draft linked to this article
    const cleanedContent = stripClass(
      newContent || currDraft.content,
      'u-area-disable'
    )
    const pipe = flow(sanitize, correctHtml)
    const data: Record<string, any> = lodash.omitBy(
      {
        uuid: v4(),
        authorId: currDraft.authorId,
        articleId: currArticle.id,
        title: currDraft.title,
        summary: currDraft.summary,
        summaryCustomized: currDraft.summaryCustomized,
        content: pipe(cleanedContent),
        tags: currTagContents,
        cover: currArticle.cover,
        collection: currCollectionIds,
        archived: false,
        publishState: PUBLISH_STATE.pending,
        circleId: currArticleCircle?.circleId,
        access: currArticleCircle?.access,
        license: currDraft?.license,
        requestForDonation: currDraft?.requestForDonation,
        replyToDonator: currDraft?.replyToDonator,
        // iscnPublish,
      },
      lodash.isUndefined // to drop only undefined // _.isNil
    )
    const revisedDraft = await draftService.baseCreate(data)

    // add job to publish queue
    revisionQueue.publishRevisedArticle({
      draftId: revisedDraft.id,
      iscnPublish,
    })
  }

  if (isUpdatingContent) {
    // check diff distances reaches limit or not
    const cleanedContent = stripClass(content || '', 'u-area-disable')
    const diffs = measureDiffs(
      stripHtml(draft.content, ''),
      stripHtml(cleanedContent, '')
    )
    if (diffs > 50) {
      throw new ArticleRevisionContentInvalidError('revised content invalid')
    }

    if (diffs > 0) {
      // only republish when have changes
      await republish(content)
    }
  } else if (isUpdatingCircleOrAccess || isUpdatingISCNPublish) {
    await republish()
  }

  /**
   * Result
   */
  const node = await draftService.baseFindById(article.draftId)

  // invalidate circle
  if (circle) {
    node[CACHE_KEYWORD] = [
      {
        id: circle.id,
        type: NODE_TYPES.Circle,
      },
    ]
  }

  return node
}

export default resolver
