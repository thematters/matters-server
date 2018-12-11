import { Context } from 'definitions'

import updateUserInfo from './updateUserInfo'
import followUser from './followUser'
import unfollowUser from './unfollowUser'
import updateNotificationSetting from './updateNotificationSetting'

export default {
  Mutation: {
    userRegister: (root: any, { input }: any, { userService }: Context) =>
      userService.create(input),
    userLogin: (root: any, { input }: any, { userService }: Context) =>
      userService.login(input),
    updateUserInfo,
    followUser,
    unfollowUser,
    updateNotificationSetting
  }
}
