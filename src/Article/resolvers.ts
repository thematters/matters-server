import lodash from 'lodash'

import { USER_ACTION } from 'src/common/enums'
import { ResolverMap } from 'src/definitions'

export const resolvers: ResolverMap = {
  Query: {
    article: (root, { id }, { articleService }, info) =>
      articleService.loader.load(id)
  },
  Mutation: {
    achiveArticle: (root, { id }, { articleService }) =>
      articleService.updateById(id, { publishState: 'archived' }),
    publishArticle: (root, { article }, { articleService }) =>
      // articleService.publish(article)
      null
  },

  Article: {
    MAT: async ({ id }, _, { actionService }) => {
      const appreciateActions = await actionService.findActionByTarget(
        USER_ACTION.appreciate,
        id
      )
      return lodash.sumBy(appreciateActions, 'detail')
    },
    author: ({ authorId }, _, { userService }) =>
      userService.loader.load(authorId),
    content: ({ hash }, _, { articleService }) =>
      articleService.getContentFromHash(hash),
    wordCount: (root, _, { articleService }) =>
      articleService.countWords(
        root.content || articleService.getContentFromHash(root.hash)
      ),
    upstream: ({ upstreamId }, _, { articleService }) =>
      articleService.loader.load(upstreamId),
    downstreams: ({ downstreamIds }, _, { articleService }) =>
      articleService.loader.loadMany(downstreamIds),
    relatedArticles: ({ relatedArticleIds }, _, { articleService }) => [], // placeholder for recommendation engine
    subscribers: async ({ id }, _, { actionService, userService }) => {
      const actions = await actionService.findActionByTarget(
        USER_ACTION.subscribeArticle,
        id
      )
      return userService.loader.loadMany(actions.map(({ userId }) => userId))
    },
    // appreciators: ({ appreciatorIds }, _, { userService }) =>
    //   appreciatorIds.map((id: string) => userService.findById(id)),
    commentCount: ({ id }, _, { commentService }) =>
      commentService.countByArticle(id),
    comments: ({ id }, _, { commentService }) =>
      commentService.findByArticle(id),
    pinnedComments: ({ pinnedCommentIds }, _, { commentService }) =>
      commentService.loader.loadMany(pinnedCommentIds)
  }
}
