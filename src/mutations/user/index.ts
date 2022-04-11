import addCredit from './addCredit'
import changeEmail from './changeEmail'
import claimLogbooks from './claimLogbooks'
import clearReadHistory from './clearReadHistory'
import clearSearchHistory from './clearSearchHistory'
import confirmVerificationCode from './confirmVerificationCode'
import connectStripeAccount from './connectStripeAccount'
import generateLikerId from './generateLikerId'
import generateSigningMessage from './generateSigningMessage'
import migration from './migration'
import payout from './payout'
import payTo from './payTo'
import resetLikerId from './resetLikerId'
import resetPassword from './resetPassword'
import sendVerificationCode from './sendVerificationCode'
import toggleBlockUser from './toggleBlockUser'
import toggleFollowTag from './toggleFollowTag'
import toggleFollowUser from './toggleFollowUser'
import toggleSubscribePush from './toggleSubscribePush'
import toggleUsersBadge from './toggleUsersBadge'
import updateNotificationSetting from './updateNotificationSetting'
import updateUserInfo from './updateUserInfo'
import updateUserRole from './updateUserRole'
import updateUserState from './updateUserState'
import userLogin from './userLogin'
import userLogout from './userLogout'
import userRegister from './userRegister'
import walletLogin from './walletLogin'

export default {
  Mutation: {
    sendVerificationCode,
    confirmVerificationCode,
    resetPassword,
    changeEmail,
    userRegister,
    userLogin,
    userLogout,
    walletLogin,
    generateLikerId,
    generateSigningMessage,
    resetLikerId,
    updateUserInfo,
    updateNotificationSetting,
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
    toggleUsersBadge,
    claimLogbooks,
  },
}
