import { Context } from 'definitions/index'

export default {
  User: {
    comments: ({ id }: { id: number }, _: any, { commentService }: Context) =>
      commentService.findByAuthor(id)
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
    comments: ({ id }: { id: number }, _: any, { commentService }: Context) =>
      commentService.findByArticle(id)
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
      commentService.countUpVoteByTargetId(id),
    downvotes: ({ id }: { id: number }, _: any, { commentService }: Context) =>
      commentService.countDownVoteByTargetId(id),
    myVote: (parent: any, _: any, { userService }: Context) => 'up_vote',
    mentions: (
      { mentionedUserId }: { mentionedUserId: [number] },
      _: any,
      { userService }: Context
    ) => userService.idLoader.loadMany(mentionedUserId),
    comments: ({ id }: { id: number }, _: any, { commentService }: Context) =>
      commentService.findByParent(id),
    // hasCitation,
    parentComment: (
      { parentCommentId }: { parentCommentId: number },
      _: any,
      { commentService }: Context
    ) =>
      parentCommentId ? commentService.idLoader.load(parentCommentId) : null
  }
}
