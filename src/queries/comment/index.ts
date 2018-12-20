import { BatchParams, Context, ArticleToCommentsArgs } from 'definitions'
import { toGlobalId, fromGlobalId } from 'common/utils'

export default {
  User: {
    commentedArticles: async (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { commentService, articleService }: Context
    ) => {
      const comments = await commentService.findByAuthorInBatch(
        id,
        offset,
        limit
      )
      return articleService.idLoader.loadMany(
        comments.map(({ articleId }: { articleId: string }) => articleId)
      )
    }
  },
  Article: {
    commentCount: (
      { id }: { id: string },
      _: any,
      { commentService }: Context
    ) => commentService.countByArticle(id),
    pinnedComments: (
      { id }: { id: string },
      _: any,
      { commentService }: Context
    ) => commentService.findPinnedByArticle(id),
    comments: (
      { id }: { id: string },
      { input }: ArticleToCommentsArgs,
      { commentService }: Context
    ) => {
      const args = { ...input, id }
      if (input.author) {
        const { id: authorId } = fromGlobalId(input.author)
        args.author = authorId
      }

      return commentService.findByArticle(args)
    }
  },
  Comment: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'Comment', id })
    },
    article: (
      { articleId }: { articleId: string },
      _: any,
      { articleService }: Context
    ) => articleService.idLoader.load(articleId),
    author: (
      { authorId }: { authorId: string },
      _: any,
      { userService }: Context
    ) => userService.idLoader.load(authorId),
    upvotes: ({ id }: { id: string }, _: any, { commentService }: Context) =>
      commentService.countUpVote(id),
    downvotes: ({ id }: { id: string }, _: any, { commentService }: Context) =>
      commentService.countDownVote(id),
    myVote: (parent: any, _: any, { userService }: Context) => 'up_vote',
    mentions: async (
      { id }: { id: string },
      _: any,
      { userService, commentService }: Context
    ) => {
      const mentionedUserIds = (await commentService.findMentionedUsers(
        id
      )).map(m => m.userId)
      return userService.idLoader.loadMany(mentionedUserIds)
    },
    comments: ({ id }: { id: string }, _: any, { commentService }: Context) =>
      commentService.findByParent(id),
    parentComment: (
      { parentCommentId }: { parentCommentId: string },
      _: any,
      { commentService }: Context
    ) =>
      parentCommentId ? commentService.idLoader.load(parentCommentId) : null
  }
}
