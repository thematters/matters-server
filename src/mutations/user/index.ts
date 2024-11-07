import addCredit from './addCredit'
import claimLogbooks from './claimLogbooks'
import clearReadHistory from './clearReadHistory'
import clearSearchHistory from './clearSearchHistory'
import confirmVerificationCode from './confirmVerificationCode'
import connectStripeAccount from './connectStripeAccount'
import emailLogin from './emailLogin'
import generateSigningMessage from './generateSigningMessage'
import migration from './migration'
import payout from './payout'
import payTo from './payTo'
import putFeaturedTags from './putFeaturedTags'
import refreshIPNSFeed from './refreshIPNSFeed'
import resetLikerId from './resetLikerId'
import resetPassword from './resetPassword'
import sendVerificationCode from './sendVerificationCode'
import setCurrency from './setCurrency'
import setEmail from './setEmail'
import setPassword from './setPassword'
import setUserName from './setUserName'
import { socialLogin, addSocialLogin, removeSocialLogin } from './socialLogin'
import toggleBlockUser from './toggleBlockUser'
import toggleFollowTag from './toggleFollowTag'
import toggleFollowUser from './toggleFollowUser'
import toggleUsersBadge from './toggleUsersBadge'
import unbindLikerId from './unbindLikerId'
import updateNotificationSetting from './updateNotificationSetting'
import updateUserExtra from './updateUserExtra'
import updateUserInfo from './updateUserInfo'
import updateUserRole from './updateUserRole'
import updateUserState from './updateUserState'
import userLogout from './userLogout'
import verifyEmail from './verifyEmail'
import { walletLogin, addWalletLogin, removeWalletLogin } from './walletLogin'

export default {
  Mutation: {
    sendVerificationCode,
    confirmVerificationCode,
    resetPassword,
    emailLogin,
    userLogout,
    walletLogin,
    addWalletLogin,
    removeWalletLogin,
    generateSigningMessage,
    resetLikerId,
    updateUserInfo,
    updateNotificationSetting,
    setCurrency,
    toggleBlockUser,
    toggleFollowTag,
    toggleFollowUser,
    clearReadHistory,
    clearSearchHistory,
    updateUserState,
    updateUserRole,
    updateUserExtra,
    setEmail,
    setUserName,
    setPassword,
    refreshIPNSFeed,
    migration,
    addCredit,
    payTo,
    payout,
    connectStripeAccount,
    toggleUsersBadge,
    unbindLikerId,
    claimLogbooks,
    putFeaturedTags,
    socialLogin,
    addSocialLogin,
    removeSocialLogin,
    verifyEmail,
  },
}
