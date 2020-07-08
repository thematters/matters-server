import addCredit from './addCredit'
import blockUser from './blockUser'
import changeEmail from './changeEmail'
import clearReadHistory from './clearReadHistory'
import clearSearchHistory from './clearSearchHistory'
import confirmVerificationCode from './confirmVerificationCode'
import connectStripeAccount from './connectStripeAccount'
import followUser from './followUser'
import generateLikerId from './generateLikerId'
import migration from './migration'
import payout from './payout'
import payTo from './payTo'
import resetPassword from './resetPassword'
import sendVerificationCode from './sendVerificationCode'
import toggleBlockUser from './toggleBlockUser'
import toggleFollowTag from './toggleFollowTag'
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
    toggleFollowTag,
    toggleFollowUser,
    clearReadHistory,
    clearSearchHistory,
    updateUserState,
    updateUserRole,
    migration,
    addCredit,
    payTo,
    payout,
    connectStripeAccount,
  },
}
