import type { GQLResolvers } from 'definitions'

import { NODE_TYPES, COMMENT_TYPE } from 'common/enums'
import { toGlobalId } from 'common/utils'

import comments from './comments'

const schema: GQLResolvers = {
  Journal: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Journal, id }),
    content: ({ content }) => content,
    assets: ({ id }, _, { dataSources: { journalService } }) =>
      journalService.getAssets(id),
    author: ({ authorId }, _, { dataSources: { atomService } }) =>
      atomService.userIdLoader.load(authorId),
    state: ({ state }) => state,

    commentCount: ({ id }, _, { dataSources: { commentService } }) =>
      commentService.count(id, COMMENT_TYPE.journal),
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
        { id, authorId, type: COMMENT_TYPE.journal },
        viewer.id
      )
    },

    likeCount: ({ id }, _, { dataSources: { journalService } }) =>
      journalService.countLikes(id),
    liked: ({ id }, _, { dataSources: { journalService }, viewer }) =>
      viewer.id ? journalService.isLiked(id, viewer.id) : false,

    createdAt: ({ createdAt }) => createdAt,
  },
}

export default schema
