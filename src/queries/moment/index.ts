import type { GQLResolvers } from 'definitions'

import { NODE_TYPES, COMMENT_TYPE } from 'common/enums'
import { toGlobalId } from 'common/utils'

import comments from './comments'

const schema: GQLResolvers = {
  Moment: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Moment, id }),
    content: ({ content }) => content,
    assets: ({ id }, _, { dataSources: { momentService } }) =>
      momentService.getAssets(id),
    author: ({ authorId }, _, { dataSources: { atomService } }) =>
      atomService.userIdLoader.load(authorId),
    state: ({ state }) => state,

    commentCount: ({ id }, _, { dataSources: { commentService } }) =>
      commentService.count(id, COMMENT_TYPE.moment),
    comments: comments,
    commentedFollowees: (
      { id, authorId },
      _,
      { dataSources: { commentService }, viewer }
    ) => {
      if (!viewer.id) {
        return []
      }
      return commentService.findCommentedFollowees(
        { id, authorId, type: COMMENT_TYPE.moment },
        viewer.id
      )
    },

    likeCount: ({ id }, _, { dataSources: { momentService } }) =>
      momentService.countLikes(id),
    liked: ({ id }, _, { dataSources: { momentService }, viewer }) =>
      viewer.id ? momentService.isLiked(id, viewer.id) : false,

    createdAt: ({ createdAt }) => createdAt,
  },
}

export default schema
