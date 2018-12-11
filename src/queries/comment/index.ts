import { BatchParams, Context } from 'definitions'

export default {
  User: {
    comments: (
      { id }: { id: number },
      { input: { offset, limit } }: BatchParams,
      { commentService }: Context
    ) => commentService.findByAuthorInBatch(id, offset, limit)
  },
  Article: {
    commentCount: (
      { id }: { id: number },
      _: any,
      { commentService }: Context
    ) => commentService.countByArticle(id),
    pinnedComments: (
      { id }: { id: number },
      _: any,
      { commentService }: Context
    ) => commentService.findPinnedByArticle(id),
    comments: (
      { id }: { id: number },
      { input: { offset, limit } }: BatchParams,
      { commentService }: Context
    ) => commentService.findByArticleInBatch(id, offset, limit)
  },
  Comment: {
    article: (
      { articleId }: { articleId: number },
      _: any,
      { articleService }: Context
    ) => articleService.idLoader.load(articleId),
    author: (
      { authorId }: { authorId: number },
      _: any,
      { userService }: Context
    ) => userService.idLoader.load(authorId),
    upvotes: ({ id }: { id: number }, _: any, { commentService }: Context) =>
      commentService.countUpVote(id),
    downvotes: ({ id }: { id: number }, _: any, { commentService }: Context) =>
      commentService.countDownVote(id),
    myVote: (parent: any, _: any, { userService }: Context) => 'up_vote',
    mentions: (
      { mentionedUserId }: { mentionedUserId: [number] },
      _: any,
      { userService }: Context
    ) => userService.idLoader.loadMany(mentionedUserId),
    comments: ({ id }: { id: number }, _: any, { commentService }: Context) =>
      commentService.findByParent(id),
    parentComment: (
      { parentCommentId }: { parentCommentId: number },
      _: any,
      { commentService }: Context
    ) =>
      parentCommentId ? commentService.idLoader.load(parentCommentId) : null
  }
}
