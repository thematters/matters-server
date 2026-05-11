import type { Context, GQLMutationResolvers } from '#definitions/index.js'

import { COMMENT_TYPE, NODE_TYPES } from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

type RestoreCommunityWatchCommentInput = {
  uuid: string
  note?: string | null
}

const resolver = async (
  _: unknown,
  { input: { uuid, note } }: { input: RestoreCommunityWatchCommentInput },
  { viewer, dataSources: { commentService, connections } }: Context
) => {
  if (!viewer.hasRole('admin')) {
    throw new ForbiddenError('viewer has no permission')
  }

  const { action, comment } = await commentService.restoreCommunityWatchComment({
    uuid,
    actorId: viewer.id,
    note,
  })

  await invalidateFQC({
    node: {
      id: comment.targetId,
      type:
        comment.type === COMMENT_TYPE.article
          ? NODE_TYPES.Article
          : NODE_TYPES.Moment,
    },
    redis: connections.redis,
  })

  return action
}

export default resolver as GQLMutationResolvers['restoreCommunityWatchComment']
