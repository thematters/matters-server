import { ResolverMap } from 'src/definitions'

export const resolvers: ResolverMap = {
  Mutation: {},

  Comment: {
    article: ({ articleId }, _, { articleService }) =>
      articleService.loader.load(articleId),
    author: ({ authorId }, _, { userService }) =>
      userService.loader.load(authorId),
    mentions: ({ mentionIds }, _, { userService }) =>
      userService.loader.loadMany(mentionIds),
    comments: ({ id }, _, { commentService }) =>
      commentService.findByParent(id),
    parentComment: ({ parentCommentId }, _, { commentService }) =>
      parentCommentId ? commentService.loader.load(parentCommentId) : null
  }
}
