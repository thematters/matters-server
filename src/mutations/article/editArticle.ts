import type { Article, DataSources, GQLMutationResolvers } from 'definitions'
import type { Knex } from 'knex'

import { stripHtml } from '@matters/ipns-site-generator'
import {
  html2md,
  normalizeArticleHTML,
  sanitizeHTML,
} from '@matters/matters-editor/transformers'
import lodash, { difference, isEqual, uniq } from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  ASSET_TYPE,
  CACHE_KEYWORD,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  MAX_ARTICLE_CONTENT_LENGTH,
  MAX_ARTICLE_CONTENT_REVISION_LENGTH,
  MAX_ARTICLE_REVISION_COUNT,
  MAX_ARTICLES_PER_CONNECTION_LIMIT,
  MAX_TAGS_PER_ARTICLE_LIMIT,
  NODE_TYPES,
  PUBLISH_STATE,
  USER_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  ArticleCollectionReachLimitError,
  ArticleNotFoundError,
  ArticleRevisionContentInvalidError,
  ArticleRevisionReachLimitError,
  AssetNotFoundError,
  CircleNotFoundError,
  DraftNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  NotAllowAddOfficialTagError,
  TooManyTagsForArticleError,
  UserInputError,
} from 'common/errors'
import { getLogger } from 'common/logger'
import { fromGlobalId, measureDiffs, normalizeTagInput } from 'common/utils'
import { publicationQueue, revisionQueue } from 'connectors/queue'

const logger = getLogger('mutation-edit-article')

const resolver: GQLMutationResolvers['editArticle'] = async (
  _,
  {
    input: {
      id,
      state,
      sticky,
      pinned,
      tags,
      content,
      summary,
      cover,
      collection,
      circle: circleGlobalId,
      accessType,
      sensitive,
      license,
      requestForDonation,
      replyToDonator,
      iscnPublish,
      canComment,
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
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
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
   * Pinned or Sticky
   */
  const isPinned = pinned ?? sticky
  if (typeof isPinned === 'boolean') {
    await articleService.updatePinned(article.id, viewer.id, isPinned)
  }

  /**
   * Tags
   */
  if (tags !== undefined) {
    await handleTags({
      viewerId: viewer.id,
      tags,
      article,
      dataSources: {
        tagService,
      },
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
   * Connection
   */
  if (collection !== undefined) {
    await handleConnection({
      viewerId: viewer.id,
      collection,
      article,
      dataSources: {
        atomService,
        userService,
        articleService,
        notificationService,
      },
      knex,
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
   * Comment settings
   */
  if (canComment !== undefined && canComment !== draft.canComment) {
    if (canComment === true) {
      await atomService.update({
        table: 'draft',
        where: { id: article.draftId },
        data: {
          canComment,
          updatedAt: knex.fn.now(),
        },
      })
    } else {
      throw new ForbiddenError(`canComment can not be turned off`)
    }
  }

  /**
   * Sensitive settings
   */
  if (sensitive !== undefined && sensitive !== draft.sensitiveByAuthor) {
    await atomService.update({
      table: 'draft',
      where: { id: article.draftId },
      data: {
        sensitiveByAuthor: sensitive,
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
      articleService.findConnections({ entranceId: article.id }),
      tagService.findByArticleId({ articleId: article.id }),
      articleService.findArticleCircle(article.id),
    ])
    const currTagContents = currTags.map((currTag) => currTag.content)
    const currCollectionIds = currCollections.map(
      ({ articleId }: { articleId: string }) => articleId
    )

    // create draft linked to this article
    const _content = normalizeArticleHTML(
      sanitizeHTML(newContent || currDraft.content)
    )
    let contentMd = ''
    try {
      contentMd = html2md(_content)
    } catch (e) {
      logger.warn('draft %s failed to convert HTML to Markdown', draft.id)
    }
    const data: Record<string, any> = lodash.omitBy(
      {
        uuid: v4(),
        authorId: currDraft.authorId,
        articleId: currArticle.id,
        title: currDraft.title,
        summary: currDraft.summary,
        summaryCustomized: currDraft.summaryCustomized,
        content: _content,
        contentMd,
        tags: currTagContents,
        cover: currArticle.cover,
        collection: currCollectionIds,
        archived: false,
        publishState: PUBLISH_STATE.pending,
        circleId: currArticleCircle?.circleId,
        access: currArticleCircle?.access,
        sensitiveByAuthor: currDraft?.sensitiveByAuthor,
        license: currDraft?.license,
        requestForDonation: currDraft?.requestForDonation,
        replyToDonator: currDraft?.replyToDonator,
        canComment: currDraft?.canComment,
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

  if (content) {
    // check for content length limit
    if (content.length > MAX_ARTICLE_CONTENT_LENGTH) {
      throw new UserInputError('content reach length limit')
    }

    // check diff distances reaches limit or not
    const diffs = measureDiffs(
      stripHtml(normalizeArticleHTML(draft.content)),
      stripHtml(normalizeArticleHTML(content))
    )
    if (diffs > MAX_ARTICLE_CONTENT_REVISION_LENGTH) {
      throw new ArticleRevisionContentInvalidError('revised content invalid')
    }

    if (diffs > 0) {
      // only republish when have changes
      await republish(content)
    }
  } else if (isUpdatingCircleOrAccess) {
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

const handleTags = async ({
  viewerId,
  tags,
  article,
  dataSources: { tagService },
}: {
  viewerId: string
  tags: string[] | null
  article: Article
  dataSources: Pick<DataSources, 'tagService'>
}) => {
  // validate
  const oldIds = (
    await tagService.findByArticleId({ articleId: article.id })
  ).map(({ id: tagId }: { id: string }) => tagId)

  if (
    tags &&
    tags.length > MAX_TAGS_PER_ARTICLE_LIMIT &&
    tags.length > oldIds.length
  ) {
    throw new TooManyTagsForArticleError(
      `Not allow more than ${MAX_TAGS_PER_ARTICLE_LIMIT} tags on an article`
    )
  }

  // create tag records
  const tagEditors = environment.mattyId
    ? [environment.mattyId, article.authorId]
    : [article.authorId]
  const dbTags =
    tags === null
      ? []
      : (
          await Promise.all(
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
        ).map(({ id, content }) => ({ id: `${id}`, content }))

  const newIds = dbTags.map(({ id: tagId }) => tagId)

  // check if add tags include matty's tag
  const mattyTagId = environment.mattyChoiceTagId || ''
  const isMatty = environment.mattyId === viewerId
  const addIds = difference(newIds, oldIds)
  if (addIds.includes(mattyTagId) && !isMatty) {
    throw new NotAllowAddOfficialTagError('not allow to add official tag')
  }

  // add
  await tagService.createArticleTags({
    articleIds: [article.id],
    creator: article.authorId,
    tagIds: addIds,
  })

  // delete unwanted
  await tagService.deleteArticleTagsByTagIds({
    articleId: article.id,
    tagIds: difference(oldIds, newIds),
  })
}

const handleConnection = async ({
  viewerId,
  collection,
  article,
  dataSources: {
    atomService,
    userService,
    articleService,
    notificationService,
  },
  knex,
}: {
  viewerId: string
  collection: string[] | null
  article: Article
  dataSources: Pick<
    DataSources,
    'atomService' | 'userService' | 'articleService' | 'notificationService'
  >
  knex: Knex
}) => {
  const oldIds = (
    await articleService.findConnections({
      entranceId: article.id,
    })
  ).map(({ articleId }: { articleId: string }) => articleId)
  const newIds =
    collection === null
      ? []
      : uniq(collection.map((articleId) => fromGlobalId(articleId).id)).filter(
          (id) => !!id
        )
  const newIdsToAdd = difference(newIds, oldIds)
  const oldIdsToDelete = difference(oldIds, newIds)

  // do nothing if no change
  if (isEqual(oldIds, newIds)) {
    return
  }
  // only validate new-added articles
  if (newIdsToAdd.length) {
    if (
      newIds.length > MAX_ARTICLES_PER_CONNECTION_LIMIT &&
      newIds.length >= oldIds.length
    ) {
      throw new ArticleCollectionReachLimitError(
        `Not allow more than ${MAX_ARTICLES_PER_CONNECTION_LIMIT} articles in connection`
      )
    }
    await Promise.all(
      newIdsToAdd.map(async (articleId) => {
        const collectedArticle = await atomService.findUnique({
          table: 'article',
          where: { id: articleId },
        })

        if (!collectedArticle) {
          throw new ArticleNotFoundError(`Cannot find article ${articleId}`)
        }

        if (collectedArticle.state !== ARTICLE_STATE.active) {
          throw new ForbiddenError(`Article ${articleId} cannot be collected.`)
        }

        const isBlocked = await userService.blocked({
          userId: collectedArticle.authorId,
          targetId: viewerId,
        })

        if (isBlocked) {
          throw new ForbiddenError('viewer has no permission')
        }
      })
    )
  }

  interface Item {
    entranceId: string
    articleId: string
    order: number
  }
  const addItems: Item[] = []
  const updateItems: Item[] = []

  // gather data
  newIds.forEach((articleId: string, index: number) => {
    const isNew = newIdsToAdd.includes(articleId)
    if (isNew) {
      addItems.push({ entranceId: article.id, articleId, order: index })
    }
    if (!isNew && index !== oldIds.indexOf(articleId)) {
      updateItems.push({ entranceId: article.id, articleId, order: index })
    }
  })

  await Promise.all([
    ...addItems.map((item) =>
      atomService.create({
        table: 'article_connection',
        data: {
          ...item,
        },
      })
    ),
    ...updateItems.map((item) =>
      atomService.update({
        table: 'article_connection',
        where: { entranceId: item.entranceId, articleId: item.articleId },
        data: { order: item.order, updatedAt: knex.fn.now() },
      })
    ),
  ])

  // delete unwanted
  await atomService.deleteMany({
    table: 'article_connection',
    where: { entranceId: article.id },
    whereIn: ['article_id', oldIdsToDelete],
  })

  // trigger notifications
  newIdsToAdd.forEach(async (articleId) => {
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
}

export default resolver
