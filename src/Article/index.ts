// external
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLEnumType,
  GraphQLInt
} from 'graphql'

// local
import { UserType } from '../User'
import { CommentType } from '../Comment'
import { DateTimeType } from '../common/graphqlTypes'

export { ArticleService } from './articleService'

const ArticleFormType = new GraphQLEnumType({
  name: 'ArticleForm',
  values: {
    ARTICLE: { value: 'article' },
    COURSE: { value: 'course' }
  }
})

const PublishStateType = new GraphQLEnumType({
  name: 'PublishState',
  values: {
    ARCHIVED: { value: 'archived' },
    PENDING: { value: 'pending' },
    ERROR: { value: 'error' },
    PUBLISHED: { value: 'published ' }
  }
})

export const ArticleType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Article',
  description: 'Article object',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    form: { type: new GraphQLNonNull(ArticleFormType) },
    timestamp: { type: new GraphQLNonNull(DateTimeType) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    cover: { type: new GraphQLNonNull(GraphQLString) },
    tags: { type: new GraphQLList(new GraphQLNonNull(GraphQLString)) },
    publishState: { type: PublishStateType },
    hash: { type: GraphQLString },
    MAT: { type: GraphQLInt },
    author: {
      type: new GraphQLNonNull(UserType),
      resolve: ({ authorId }, _, { userService }) =>
        userService.loader.load(authorId)
    },
    content: {
      type: new GraphQLNonNull(GraphQLString),
      resolve: ({ hash }, _, { articleService }) =>
        articleService.getContentFromHash(hash)
    },
    wordCount: {
      type: GraphQLInt,
      resolve: (root, _, { articleService }) =>
        articleService.countWords(
          root.content || articleService.getContentFromHash(root.hash)
        )
    },
    upstream: {
      type: ArticleType,
      resolve: ({ upstreamId }, _, { articleService }) =>
        articleService.loader.load(upstreamId)
    },
    downstreams: {
      type: new GraphQLList(ArticleType),
      resolve: ({ downstreamIds }, _, { articleService }) =>
        articleService.loader.loadMany(downstreamIds)
    },
    relatedArticles: {
      type: new GraphQLNonNull(new GraphQLList(ArticleType)),
      resolve: ({ relatedArticleIds }, _, { articleService }) =>
        articleService.loader.loadMany(relatedArticleIds)
    },
    subscribers: {
      type: new GraphQLList(UserType),
      resolve: ({ subscriberIds }, _, { userService }) =>
        userService.loader.loadMany(subscriberIds)
    },
    // appreciators: {
    //   type: new GraphQLList(UserType),
    //   resolve: ({ appreciatorIds }, _, { userService }) =>
    //     appreciatorIds.map((id: string) => userService.findById(id))
    // },
    // commentCount: { type: new GraphQLNonNull(GraphQLInt) },
    comments: {
      type: new GraphQLList(CommentType),
      resolve: ({ id }, _, { commentService }) =>
        commentService.findByArticle(id)
    },
    pinnedComments: {
      type: new GraphQLList(CommentType),
      resolve: ({ pinnedCommentIds }, _, { commentService }) =>
        commentService.loader.loadMany(pinnedCommentIds)
    }
    // subscribed
    // hasAppreciate
  })
})
