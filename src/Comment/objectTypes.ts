// external
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLBoolean,
  GraphQLList
} from 'graphql'

// local
import { DateTimeType } from 'src/common'
import { UserType } from 'src/User'
import { ArticleType } from 'src/Article'

export const CommentType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Comment',
  description: 'Comment object',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    timestamp: {
      type: new GraphQLNonNull(DateTimeType),
      description: 'Creation time of this comment'
    },
    text: { type: new GraphQLNonNull(GraphQLString) },
    achieved: { type: new GraphQLNonNull(GraphQLBoolean) },
    // upvotes: { type: new GraphQLNonNull(GraphQLInt) },
    // downvotes: { type: new GraphQLNonNull(GraphQLInt) },
    article: {
      type: new GraphQLNonNull(ArticleType),
      description: 'Original article of this comment',
      resolve: ({ articleId }, _, { articleService }) =>
        articleService.loader.load(articleId)
    },
    author: {
      type: new GraphQLNonNull(UserType),
      resolve: ({ authorId }, _, { userService }) =>
        userService.loader.load(authorId)
    },
    // userVote: { type: VoteType },
    mentions: {
      type: new GraphQLList(UserType),
      resolve: ({ mentionIds }, _, { userService }) =>
        userService.loader.loadMany(mentionIds)
    },
    comments: {
      type: new GraphQLList(CommentType),
      resolve: ({ id }, _, { commentService }) =>
        commentService.findByParent(id)
    },
    parentComment: {
      type: CommentType,
      resolve: ({ parentCommentId }, _, { commentService }) =>
        parentCommentId ? commentService.loader.load(parentCommentId) : null
    }
    // subscribed: Bool
  })
})
