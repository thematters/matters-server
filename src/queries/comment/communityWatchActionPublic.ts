import type {
  CommunityWatchAction,
  Context,
  GQLCommunityWatchActionResolvers,
} from '#definitions/index.js'

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
