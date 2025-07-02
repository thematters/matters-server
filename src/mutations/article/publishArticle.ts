import type { GQLMutationResolvers } from '#definitions/index.js'

import {
  MAX_CONTENT_LINK_TEXT_LENGTH,
  PUBLISH_STATE,
  USER_STATE,
  AUDIT_LOG_ACTION,
  ARTICLE_STATE,
} from '#common/enums/index.js'
import {
  DraftNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
  ArticleNotFoundError,
  ArticleInactiveError,
} from '#common/errors.js'
import { auditLog } from '#common/logger.js'
import { fromGlobalId } from '#common/utils/index.js'
import { AtomService } from '#connectors/index.js'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  normalizeArticleHTML,
  sanitizeHTML,
} = require('@matters/matters-editor/transformers')

const resolver: GQLMutationResolvers['publishArticle'] = async (
  _,
  { input: { id: globalId, iscnPublish, publishAt } },
  { viewer, dataSources: { atomService, articleService, collectionService } }
) => {
  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  if (publishAt && publishAt < new Date()) {
    throw new UserInputError('publishAt must be in the future')
  }

  // retrieve data from draft
  const { id } = fromGlobalId(globalId)
  const draft = await atomService.draftIdLoader.load(id)
  const isPublished = draft.publishState === PUBLISH_STATE.published
  const isPending = draft.publishState === PUBLISH_STATE.pending

  // validate draft before publishing or scheduling
  if (draft.authorId !== viewer.id || (draft.archived && !isPublished)) {
    throw new DraftNotFoundError('draft does not exists')
  }

  // cancel publication if publishAt is null and draft is not published
  if (publishAt === null && !isPublished) {
    const cancelledDraft = await atomService.update({
      table: 'draft',
      where: { id: draft.id },
      data: {
        publishState: PUBLISH_STATE.unpublished,
        publishAt: null,
      },
    })
    return cancelledDraft
  }

  // return draft if it is already published or pending
  if (isPending || isPublished || (draft.archived && isPublished)) {
    return draft
  }

  if (!draft.title.trim()) {
    throw new UserInputError('title is required')
  }

  if (!draft.content) {
    throw new UserInputError('content is required')
  }

  if (draft.circleId && draft.campaigns?.length > 0) {
    throw new UserInputError(
      'Article cannot be added to campaign or circle at the same time'
    )
  }

  if (draft.collections) {
    await Promise.all(
      draft.collections.map((collectionId) =>
        collectionService.validateCollection({
          collectionId,
          newArticlesCount: 1,
          userId: draft.authorId,
        })
      )
    )
  }

  await validateConnections(draft.connections, atomService)

  const updatedDraft = await atomService.update({
    table: 'draft',
    where: { id: draft.id },
    data: {
      content: normalizeArticleHTML(
        sanitizeHTML(draft.content, { maxHardBreaks: -1, maxSoftBreaks: -1 }),
        {
          truncate: {
            maxLength: MAX_CONTENT_LINK_TEXT_LENGTH,
            keepProtocol: false,
          },
        }
      ),
      publishState: publishAt ? undefined : PUBLISH_STATE.pending,
      iscnPublish,
      publishAt,
    },
  })

  if (publishAt === undefined) {
    // publish now
    const publishedDraft = await articleService.publishArticle(draft.id)
    auditLog({
      actorId: viewer.id,
      action: AUDIT_LOG_ACTION.addPublishArticleJob,
      entity: 'draft',
      entityId: draft.id,
      status: 'succeeded',
    })
    return publishedDraft
  }

  return updatedDraft
}

const validateConnections = async (
  connections: string[] | null,
  atomService: AtomService
) => {
  if (!connections) {
    return
  }
  await Promise.all(
    connections.map(async (connectionId) => {
      const article = await atomService.findFirst({
        table: 'article',
        where: { id: connectionId },
      })
      if (!article) {
        throw new ArticleNotFoundError('Article not found')
      }
      if (article.state !== ARTICLE_STATE.active) {
        throw new ArticleInactiveError('Article to connect is inactive')
      }
    })
  )
}

export default resolver
