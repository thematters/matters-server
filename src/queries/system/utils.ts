import type { Context, Draft } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { EntityNotFoundError, ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

export const getNode = async (globalId: string, context: Context) => {
  const {
    viewer,
    dataSources: { atomService },
  } = context
  const services = {
    [NODE_TYPES.Article]: atomService.articleIdLoader,
    [NODE_TYPES.ArticleVersion]: atomService.articleVersionIdLoader,
    [NODE_TYPES.User]: atomService.userIdLoader,
    [NODE_TYPES.Comment]: atomService.commentIdLoader,
    [NODE_TYPES.Draft]: atomService.draftIdLoader,
    [NODE_TYPES.Tag]: atomService.tagIdLoader,
    [NODE_TYPES.Circle]: atomService.circleIdLoader,
    [NODE_TYPES.Topic]: atomService.topicIdLoader,
    [NODE_TYPES.Chapter]: atomService.chapterIdLoader,
    [NODE_TYPES.Collection]: atomService.collectionIdLoader,
    [NODE_TYPES.IcymiTopic]: atomService.icymiTopicIdLoader,
  } as const

  const { type, id } = fromGlobalId(globalId)

  const nodeService = services[type as keyof typeof services]

  if (!nodeService) {
    throw new EntityNotFoundError(`${type} is not supported yet`)
  }

  const node = await nodeService.load(id)

  if (!node) {
    throw new EntityNotFoundError('target does not exist')
  }

  if (type === 'Draft' && viewer.id !== (node as Draft).authorId) {
    throw new ForbiddenError('only author is allowed to view draft')
  }

  return { ...node, __type: type }
}
