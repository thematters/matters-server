import userRegister from './userRegister'
import userLogin from './userLogin'
import updateUserInfo from './updateUserInfo'
import updateNotificationSetting from './updateNotificationSetting'
import followUser from './followUser'
import unfollowUser from './unfollowUser'

export default {
  Mutation: {
    userRegister,
    userLogin,
    updateUserInfo,
    updateNotificationSetting,
    followUser,
    unfollowUser
  }
}
