// external
import { sum } from 'lodash'
import { BatchParams, Context } from 'definitions'
import { toGlobalId, fromGlobalId } from 'common/utils'

export default {
  Query: {
    viewer: (root: any, _: any, { viewer }: Context) => viewer
  },
  User: {
    id: ({ id }: { id: string }) => {
      return toGlobalId({ type: 'User', id })
    },
    info: (root: any) => root,
    // hasFollowed,
    // drafts,
    // audioDrafts,
    subscriptions: async (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { articleService, userService }: Context
    ) => {
      const actions = await userService.findSubscriptionsInBatch(
        id,
        offset,
        limit
      )
      return articleService.idLoader.loadMany(
        actions.map(({ targetId }) => targetId)
      )
    },
    // quotations,
    // activity,
    followers: async (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { userService }: Context
    ) => {
      const actions = await userService.findFollowersInBatch(id, offset, limit)
      return userService.idLoader.loadMany(actions.map(({ userId }) => userId))
    },
    followees: async (
      { id }: { id: string },
      { input: { offset, limit } }: BatchParams,
      { userService }: Context
    ) => {
      const actions = await userService.findFollowees({
        userId: id,
        offset,
        limit
      })
      return userService.idLoader.loadMany(
        actions.map(({ targetId }: { targetId: string }) => targetId)
      )
    },
    isFollower: async (
      { id }: { id: string },
      _: any,
      { viewer, userService }: Context
    ) => {
      if (!viewer) {
        return false
      }
      return await userService.isFollowing({
        userId: id,
        targetId: viewer.id
      })
    },
    isFollowee: async (
      { id }: { id: string },
      _: any,
      { viewer, userService }: Context
    ) => {
      if (!viewer) {
        return false
      }
      return await userService.isFollowing({
        userId: viewer.id,
        targetId: id
      })
    },
    settings: (root: any) => root,
    status: (root: any) => root
  },
  UserInfo: {
    avatar: async (
      { avatar }: { avatar: string },
      _: any,
      { systemService }: Context
    ) => {
      return avatar ? systemService.findAssetUrl(avatar) : null
    }
  },
  UserSettings: {
    // language: ({ language }: { language: string }) => language,
    oauthType: ({ id }: { id: string }, _: any, { userService }: Context) =>
      userService.findOAuthTypes(id),
    notification: ({ id }: { id: string }, _: any, { userService }: Context) =>
      userService.findNotifySetting(id)
  },
  UserStatus: {
    articleCount: async (
      { id }: { id: string },
      _: any,
      { articleService }: Context
    ) => articleService.countByAuthor(id),
    MAT: async (
      { id }: { id: string },
      _: any,
      { articleService }: Context
    ) => {
      const articles = await articleService.findByAuthor(id)
      const apprecations = await Promise.all(
        articles.map(({ id }: { id: string }) =>
          articleService.countAppreciation(id)
        )
      )
      return sum(apprecations)
    },
    // viewCount,
    // draftCount,
    commentCount: (
      { id }: { id: string },
      _: any,
      { commentService }: Context
    ) => commentService.countByAuthor(id),
    // quotationCount
    followerCount: ({ id }: { id: string }, _: any, { userService }: Context) =>
      userService.countFollowers(id),
    followeeCount: ({ id }: { id: string }, _: any, { userService }: Context) =>
      userService.countFollowees(id),
    subscriptionCount: (
      { id }: { id: string },
      _: any,
      { userService }: Context
    ) => userService.countSubscription(id)
  }
}
