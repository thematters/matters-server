import lodash from 'lodash'

import { ResolverMap, ThirdPartyAccount } from '../definitions'
import { enums } from '../common'
import { AppreciationAction, RatingAction } from './actionService'

const { userActions } = enums

export const resolvers: ResolverMap = {
  Query: {
    user: (root, { id }, { userService }, info) => userService.loader.load(id)
  },
  Mutation: {},

  User: {
    settings: ({ settings }) => settings,
    status: ({ id }) => ({ id }), // short hand for delegating resolver to UserStatusType
    // drafts
    // courses
    articles: ({ id }, _, { articleService }) =>
      articleService.findByAuthor(id),
    comments: ({ id }, _, { commentService }) =>
      commentService.findByAuthor(id),
    // subscriptions
    // history
    // dialogues
    // hasFollowed
    // settings
    followers: async ({ id }, _, { actionService, userService }) => {
      const followActions = await actionService.findActionByTarget(
        userActions.follow,
        id
      )
      return userService.loader.loadMany(
        followActions.map(({ userId }) => userId)
      )
    },
    follows: async ({ id }, _, { actionService, userService }) => {
      const followActions = await actionService.findActionByUser(
        userActions.follow,
        id
      )
      return userService.loader.loadMany(
        followActions.map(({ targetId }) => targetId)
      )
    }
  },
  UserSettings: {
    language: ({ language }) => language,
    thirdPartyAccounts: ({ thirdPartyAccounts }) =>
      thirdPartyAccounts.map(
        ({ accountName }: ThirdPartyAccount) => accountName
      )
  },
  UserStatus: {
    MAT: async ({ id }, _, { actionService, articleService }) => {
      const articles = await articleService.findByAuthor(id)
      // const appreciateActions: AppreciationAction[] = await actionService.findActionByTargets(
      const appreciateActions = await actionService.findActionByTargets(
        userActions.appreciate,
        articles.map(({ id }) => id)
      )
      return lodash.sumBy(appreciateActions, 'detail')
    },
    rating: async ({ id }, _, { actionService }) => {
      // const appreciateActions: RatingAction[] = await actionService.findActionByTarget(
      const appreciateActions = await actionService.findActionByTarget(
        userActions.rateUser,
        id
      )
      return lodash.meanBy(appreciateActions, 'detail')
    },
    articleCount: (parent, _, { articleService }) =>
      articleService.countByAuthor(parent.id),
    commentCount: ({ id }, _, { commentService }) =>
      commentService.countByAuthor(id),
    followCount: ({ id }, _, { actionService }) =>
      actionService.countActionByUser(userActions.follow, id),
    followerCount: ({ id }, _, { actionService }) => {
      return actionService.countActionByTarget(userActions.follow, id)
    }
    // draftCount: Number // 草稿數
    // courseCount: Number // 已購買課程數
    // subscriptionCount: Number // 總訂閱數
  }
}
