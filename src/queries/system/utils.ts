import type {
  Article,
  Comment,
  Context,
  Draft,
  GlobalId,
} from '#definitions/index.js'

import { NODE_TYPES, USER_STATE } from '#common/enums/index.js'
import {
  ArticleNotFoundError,
  EntityNotFoundError,
  ForbiddenError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const restrictedAuthorStates = new Set<string>([
  USER_STATE.frozen,
  USER_STATE.banned,
  USER_STATE.archived,
])

export const getNode = async (
  globalId: GlobalId,
  context: Context,
  {
    hideRestrictedCommentAuthorAsNull = false,
  }: { hideRestrictedCommentAuthorAsNull?: boolean } = {}
) => {
  const {
    viewer,
    dataSources: { atomService, commentService },
  } = context
  const services = {
    [NODE_TYPES.Article]: atomService.articleIdLoader,
    [NODE_TYPES.ArticleVersion]: atomService.articleVersionIdLoader,
    [NODE_TYPES.User]: atomService.userIdLoader,
    [NODE_TYPES.Comment]: atomService.commentIdLoader,
    [NODE_TYPES.Draft]: atomService.draftIdLoader,
    [NODE_TYPES.Tag]: atomService.tagIdLoader,
    [NODE_TYPES.Circle]: atomService.circleIdLoader,
    [NODE_TYPES.Collection]: atomService.collectionIdLoader,
    [NODE_TYPES.IcymiTopic]: atomService.icymiTopicIdLoader,
    [NODE_TYPES.Moment]: atomService.momentIdLoader,
    [NODE_TYPES.CurationChannel]: atomService.curationChannelIdLoader,
    [NODE_TYPES.TopicChannel]: atomService.topicChannelIdLoader,
  } as const

  const { type, id } = fromGlobalId(globalId)

  const dataloader = services[type as keyof typeof services]

  if (!dataloader) {
    throw new EntityNotFoundError(`${type} is not supported yet`)
  }

  const node = await dataloader.load(id)

  if (!node) {
    throw new EntityNotFoundError('target does not exist')
  }

  if (type === 'Draft' && viewer.id !== (node as Draft).authorId) {
    throw new ForbiddenError('only author is allowed to view draft')
  }

  if (
    type === NODE_TYPES.Comment &&
    !viewer.hasRole('admin') &&
    (await commentService.isAuthorRestricted(node as Comment))
  ) {
    if (hideRestrictedCommentAuthorAsNull) {
      return null
    }
    throw new EntityNotFoundError('target does not exist')
  }

  if (type === NODE_TYPES.Article) {
    const article = node as Article
    if (viewer.id !== article.authorId && !viewer.hasRole('admin')) {
      const author = await atomService.userIdLoader.load(article.authorId)
      if (author && restrictedAuthorStates.has(author.state)) {
        throw new ArticleNotFoundError('target article does not exists')
      }
    }
  }

  return { ...node, __type: type }
}
