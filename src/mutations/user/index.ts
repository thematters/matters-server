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
import resetLikerId from './resetLikerId'
import resetPassword from './resetPassword'
import sendVerificationCode from './sendVerificationCode'
import setCurrency from './setCurrency'
import setEmail from './setEmail'
import setPassword from './setPassword'
import setUserName from './setUserName'
import { socialLogin, addSocialLogin, removeSocialLogin } from './socialLogin'
import toggleBlockUser from './toggleBlockUser'
import toggleBookmarkTag from './toggleBookmarkTag'
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
import withdrawLockedTokens from './withdrawLockedTokens'

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
    toggleBookmarkTag,
    toggleFollowTag: toggleBookmarkTag,
    toggleFollowUser,
    clearReadHistory,
    clearSearchHistory,
    updateUserState,
    updateUserRole,
    updateUserExtra,
    setEmail,
    setUserName,
    setPassword,
    migration,
    addCredit,
    payTo,
    payout,
    connectStripeAccount,
    withdrawLockedTokens,
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
