import type { GQLResolvers } from '#definitions/index.js'

import { NODE_TYPES, COMMENT_TYPE } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'

import articles from './articles.js'
import assets from './assets.js'
import comments from './comments.js'
import { spamStatus } from './spamStatus.js'
import tags from './tags.js'

const schema: GQLResolvers = {
  Query: {
    moment: (_, { input: { shortHash } }, { dataSources: { atomService } }) =>
      atomService.findUnique({ table: 'moment', where: { shortHash } }),
  },
  Moment: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Moment, id }),
    content: ({ content }) => content,
    assets,
    tags,
    articles,
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

    spamStatus,

    createdAt: ({ createdAt }) => createdAt,
  },
}

export default schema
