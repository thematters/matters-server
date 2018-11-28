import lodash from 'lodash'
import joinMonster from 'join-monster'
import { ResolverMap, ThirdPartyAccount } from 'src/definitions'
import { USER_ACTION } from 'src/common/enums'
import { AppreciationAction, RatingAction } from './actionService'

export const resolvers: ResolverMap = {
  Query: {
    user: (root, { id }, { userService }, info) => userService.findById(id)
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
        USER_ACTION.follow,
        id
      )
      //return userService.loader.loadMany(
      //  followActions.map(({ userId }) => userId)
      //)
    },
    follows: async ({ id }, _, { actionService, userService }) => {
      const followActions = await actionService.findActionByUser(
        USER_ACTION.follow,
        id
      )
      //return userService.loader.loadMany(
      //  followActions.map(({ targetId }) => targetId)
      //)
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
        USER_ACTION.appreciate,
        articles.map(({ id }) => id)
      )
      return lodash.sumBy(appreciateActions, 'detail')
    },
    rating: async ({ id }, _, { actionService }) => {
      // const appreciateActions: RatingAction[] = await actionService.findActionByTarget(
      const appreciateActions = await actionService.findActionByTarget(
        USER_ACTION.rateUser,
        id
      )
      return lodash.meanBy(appreciateActions, 'detail')
    },
    articleCount: (parent, _, { articleService }) =>
      articleService.countByAuthor(parent.id),
    commentCount: ({ id }, _, { commentService }) =>
      commentService.countByAuthor(id),
    followCount: ({ id }, _, { actionService }) =>
      actionService.countActionByUser(USER_ACTION.follow, id),
    followerCount: ({ id }, _, { actionService }) => {
      return actionService.countActionByTarget(USER_ACTION.follow, id)
    }
    // draftCount: Number // 草稿數
    // courseCount: Number // 已購買課程數
    // subscriptionCount: Number // 總訂閱數
  }
}
