// external
import lodash from 'lodash'
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLEnumType,
  GraphQLInt
} from 'graphql'

// internal
import { UserType } from 'src/User'
import { CommentType } from 'src/Comment'
import { DateTimeType } from 'src/common/graphqlTypes'
import { enums } from 'src/common'

// local
export { ArticleService } from './articleService'

const { userActions } = enums

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
    MAT: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'MAT recieved for this article',
      resolve: async ({ id }, _, { actionService }) => {
        const appreciateActions = await actionService.findActionByTarget(
          userActions.appreciate,
          id
        )
        return lodash.sumBy(appreciateActions, 'detail')
      }
    },
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
      resolve: ({ relatedArticleIds }, _, { articleService }) => [] // placeholder for recommendation engine
    },
    subscribers: {
      type: new GraphQLList(UserType),
      resolve: async ({ id }, _, { actionService, userService }) => {
        const actions = await actionService.findActionByTarget(
          userActions.subscribeArticle,
          id
        )
        return userService.loader.loadMany(
          actions.map(({ userId }: { userId: string }) => userId)
        )
      }
    },
    // appreciators: {
    //   type: new GraphQLList(UserType),
    //   resolve: ({ appreciatorIds }, _, { userService }) =>
    //     appreciatorIds.map((id: string) => userService.findById(id))
    // },
    commentCount: {
      type: new GraphQLNonNull(GraphQLInt),
      resolve: ({ id }, _, { commentService }) =>
        commentService.countByArticle(id)
    },
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
