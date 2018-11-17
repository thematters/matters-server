// external
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt,
  GraphQLFloat,
  GraphQLEnumType
} from 'graphql'
import lodash from 'lodash'

// local
import { enums, ThirdPartyAccount } from 'src/common'
import { ArticleType } from 'src/Article'
import { CommentType } from 'src/Comment'
import { AppreciationAction, RatingAction } from './actionService'

const { userActions } = enums

const LanguageType = new GraphQLEnumType({
  name: 'UserLanguage',
  values: {
    english: { value: 'en' },
    chineseTranditional: { value: 'zh_HANT' },
    chineseSimplified: { value: 'zh_HANS' }
  }
})

export const UserSettingsType: GraphQLObjectType = new GraphQLObjectType({
  name: 'UserSettings',
  description: 'User Settings',
  fields: () => ({
    language: {
      type: new GraphQLNonNull(LanguageType),
      description: 'User language setting',
      resolve: ({ language }) => language
    },
    thirdPartyAccounts: {
      type: new GraphQLList(GraphQLString),
      description: 'Thrid  party accounts binded for the user',
      resolve: ({ thirdPartyAccounts }) =>
        thirdPartyAccounts.map(
          ({ accountName }: ThirdPartyAccount) => accountName
        )
    }
  })
})

export const UserStatusType: GraphQLObjectType = new GraphQLObjectType({
  name: 'UserStatus',
  description: 'Activity Status of this user',
  fields: () => ({
    MAT: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'Total MAT left in wallet',
      resolve: async ({ id }, _, { actionService, articleService }) => {
        const articles = await articleService.findByAuthor(id)
        const appreciateActions: Array<
          AppreciationAction
        > = await actionService.findActionByTargets(
          userActions.appreciate,
          articles.map(({ id }: { id: string }) => id)
        )
        return lodash.sumBy(appreciateActions, 'detail')
      }
    },
    rating: {
      type: new GraphQLNonNull(GraphQLFloat),
      description: 'Average rating by other users, for mentors only',
      resolve: async ({ id }, _, { actionService }) => {
        const appreciateActions: Array<
          RatingAction
        > = await actionService.findActionByTarget(userActions.rateUser, id)
        return lodash.meanBy(appreciateActions, 'detail')
      }
    },
    articleCount: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'Number of articles published by user',
      resolve: (parent, _, { articleService }) =>
        articleService.countByAuthor(parent.id)
    },
    commentCount: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'Number of comments posted by user',
      resolve: ({ id }, _, { commentService }) =>
        commentService.countByAuthor(id)
    },
    followCount: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'Number of user that this user follows',
      resolve: ({ id }, _, { actionService }) =>
        actionService.countActionByUser(userActions.follow, id)
    },
    followerCount: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'Number of user that follows this user',
      resolve: ({ id }, _, { actionService }) => {
        return actionService.countActionByTarget(userActions.follow, id)
      }
    }
    // draftCount: Number // 草稿數
    // courseCount: Number // 已購買課程數
    // subscriptionCount: Number // 總訂閱數
  })
})

export const UserType: GraphQLObjectType = new GraphQLObjectType({
  name: 'User',
  description: 'User object',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    displayName: {
      type: new GraphQLNonNull(GraphQLString)
    },
    userName: { type: new GraphQLNonNull(GraphQLString) },
    description: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'Self description of this user'
    },
    email: { type: new GraphQLNonNull(GraphQLString) },
    settings: {
      type: new GraphQLNonNull(UserSettingsType),
      resolve: ({ settings }) => settings
    },
    status: {
      type: new GraphQLNonNull(UserStatusType),
      resolve: ({ id }) => ({ id }) // short hand for delegating resolver to UserStatusType
    },
    // drafts
    // courses
    articles: {
      type: new GraphQLList(ArticleType),
      description: 'Articles written by this user',
      resolve: ({ id }, _, { articleService }) =>
        articleService.findByAuthor(id)
    },
    comments: {
      type: new GraphQLList(CommentType),
      description: 'Comments posted by this user',
      resolve: ({ id }, _, { commentService }) =>
        commentService.findByAuthor(id)
    },
    // subscriptions
    // history
    // dialogues
    // hasFollowed
    // settings
    followers: {
      type: new GraphQLList(UserType),
      description: 'Followers of this user',
      resolve: async ({ id }, _, { actionService, userService }) => {
        const followActions = await actionService.findActionByTarget(
          userActions.follow,
          id
        )
        return userService.loader.loadMany(
          followActions.map(({ userId }: { userId: string }) => userId)
        )
      }
    },
    follows: {
      type: new GraphQLList(UserType),
      description: 'Users that this user follows',
      resolve: async ({ id }, _, { actionService, userService }) => {
        const followActions = await actionService.findActionByUser(
          userActions.follow,
          id
        )
        return userService.loader.loadMany(
          followActions.map(({ targetId }: { targetId: string }) => targetId)
        )
      }
    }
  })
})
