import type {
  CommunityWatchAction,
  Context,
  GQLCommunityWatchActionResolvers,
} from '#definitions/index.js'

import { environment } from '#common/environment.js'
import { COMMENT_TYPE, NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

const getSourceNodeType = ({ targetType }: CommunityWatchAction) =>
  targetType === COMMENT_TYPE.article ? NODE_TYPES.Article : NODE_TYPES.Moment

const communityWatchActionPublic: GQLCommunityWatchActionResolvers = {
  commentId: ({ commentId }: CommunityWatchAction) =>
    toGlobalId({ type: NODE_TYPES.Comment, id: commentId }),
  sourceType: ({ targetType }: CommunityWatchAction) => targetType,
  sourceTitle: ({ targetTitle, targetId }: CommunityWatchAction) =>
    targetTitle || targetId,
  sourceId: (action: CommunityWatchAction) =>
    toGlobalId({ type: getSourceNodeType(action), id: action.targetId }),
  sourceUrl: (action: CommunityWatchAction) => {
    if (!action.targetShortHash) {
      return null
    }

    const path = action.targetType === COMMENT_TYPE.article ? 'a' : 'm'
    const commentId = toGlobalId({
      type: NODE_TYPES.Comment,
      id: action.commentId,
    })

    return `https://${environment.siteDomain}/${path}/${action.targetShortHash}#${commentId}`
  },
  actorDisplayName: async (
    { actorId }: CommunityWatchAction,
    _: unknown,
    { dataSources: { atomService } }: Context
  ) => {
    const actor = await atomService.userIdLoader.load(actorId)
    return actor.displayName || actor.userName || actor.id
  },
  contentCleared: ({ originalContent }: CommunityWatchAction) =>
    originalContent === null,
}

export default communityWatchActionPublic
