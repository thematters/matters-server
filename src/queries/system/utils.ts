import type { Context } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { EntityNotFoundError, ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

export const getNode = async (globalId: string, context: Context) => {
  const {
    viewer,
    dataSources: {
      articleService,
      atomService,
      collectionService,
      userService,
      commentService,
      draftService,
      tagService,
    },
  } = context
  const services = {
    [NODE_TYPES.Article]: articleService.draftLoader,
    [NODE_TYPES.User]: userService.dataloader,
    [NODE_TYPES.Comment]: commentService.dataloader,
    [NODE_TYPES.Draft]: draftService.dataloader,
    [NODE_TYPES.Tag]: tagService.dataloader,
    [NODE_TYPES.Circle]: atomService.circleIdLoader,
    [NODE_TYPES.Topic]: atomService.topicIdLoader,
    [NODE_TYPES.Chapter]: atomService.chapterIdLoader,
    [NODE_TYPES.Collection]: collectionService.dataloader,
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

  if (type === 'Draft' && viewer.id !== node.authorId) {
    throw new ForbiddenError('only author is allowed to view draft')
  }

  return { ...node, __type: type }
}
