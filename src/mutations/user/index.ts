import addCredit from './addCredit.js'
import claimLogbooks from './claimLogbooks.js'
import clearReadHistory from './clearReadHistory.js'
import clearSearchHistory from './clearSearchHistory.js'
import confirmVerificationCode from './confirmVerificationCode.js'
import connectStripeAccount from './connectStripeAccount.js'
import emailLogin from './emailLogin.js'
import generateSigningMessage from './generateSigningMessage.js'
import migration from './migration.js'
import payout from './payout.js'
import payTo from './payTo.js'
import putFeaturedTags from './putFeaturedTags.js'
import resetLikerId from './resetLikerId.js'
import resetPassword from './resetPassword.js'
import sendVerificationCode from './sendVerificationCode.js'
import setCurrency from './setCurrency.js'
import setEmail from './setEmail.js'
import setPassword from './setPassword.js'
import setUserName from './setUserName.js'
import {
  socialLogin,
  addSocialLogin,
  removeSocialLogin,
} from './socialLogin.js'
import toggleBlockUser from './toggleBlockUser.js'
import toggleBookmarkTag from './toggleBookmarkTag.js'
import toggleFollowUser from './toggleFollowUser.js'
import toggleUsersBadge from './toggleUsersBadge.js'
import unbindLikerId from './unbindLikerId.js'
import updateNotificationSetting from './updateNotificationSetting.js'
import updateUserExtra from './updateUserExtra.js'
import updateUserInfo from './updateUserInfo.js'
import updateUserRole from './updateUserRole.js'
import updateUserState from './updateUserState.js'
import userLogout from './userLogout.js'
import verifyEmail from './verifyEmail.js'
import {
  walletLogin,
  addWalletLogin,
  removeWalletLogin,
} from './walletLogin.js'
import withdrawLockedTokens from './withdrawLockedTokens.js'

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
