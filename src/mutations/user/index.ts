import blockUser from './blockUser'
import changeEmail from './changeEmail'
import clearReadHistory from './clearReadHistory'
import clearSearchHistory from './clearSearchHistory'
import confirmVerificationCode from './confirmVerificationCode'
import followUser from './followUser'
import generateLikerId from './generateLikerId'
import migration from './migration'
import resetPassword from './resetPassword'
import sendVerificationCode from './sendVerificationCode'
import toggleBlockUser from './toggleBlockUser'
import toggleFollowUser from './toggleFollowUser'
import toggleSubscribePush from './toggleSubscribePush'
import unblockUser from './unblockUser'
import unfollowUser from './unfollowUser'
import updateNotificationSetting from './updateNotificationSetting'
import updateUserInfo from './updateUserInfo'
import updateUserRole from './updateUserRole'
import updateUserState from './updateUserState'
import userLogin from './userLogin'
import userLogout from './userLogout'
import userRegister from './userRegister'
import verifyEmail from './verifyEmail'

export default {
  Mutation: {
    sendVerificationCode,
    confirmVerificationCode,
    resetPassword,
    changeEmail,
    verifyEmail,
    userRegister,
    userLogin,
    userLogout,
    generateLikerId,
    updateUserInfo,
    updateNotificationSetting,
    followUser,
    unblockUser,
    blockUser,
    unfollowUser,
    toggleSubscribePush,
    toggleBlockUser,
    toggleFollowUser,
    clearReadHistory,
    clearSearchHistory,
    updateUserState,
    updateUserRole,
    migration
  }
}
