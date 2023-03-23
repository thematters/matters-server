import addCredit from './addCredit.js'
import changeEmail from './changeEmail.js'
import claimLogbooks from './claimLogbooks.js'
import clearReadHistory from './clearReadHistory.js'
import clearSearchHistory from './clearSearchHistory.js'
import confirmVerificationCode from './confirmVerificationCode.js'
import connectStripeAccount from './connectStripeAccount.js'
import generateLikerId from './generateLikerId.js'
import generateSigningMessage from './generateSigningMessage.js'
import migration from './migration.js'
import payout from './payout.js'
import payTo from './payTo.js'
import putFeaturedTags from './putFeaturedTags.js'
import refreshIPNSFeed from './refreshIPNSFeed.js'
import resetLikerId from './resetLikerId.js'
import resetPassword from './resetPassword.js'
import resetWallet from './resetWallet.js'
import sendVerificationCode from './sendVerificationCode.js'
import setCurrency from './setCurrency.js'
import toggleBlockUser from './toggleBlockUser.js'
import toggleFollowTag from './toggleFollowTag.js'
import toggleFollowUser from './toggleFollowUser.js'
import togglePinTag from './togglePinTag.js'
import toggleUsersBadge from './toggleUsersBadge.js'
import unbindLikerId from './unbindLikerId.js'
import updateNotificationSetting from './updateNotificationSetting.js'
import updateUserInfo from './updateUserInfo.js'
import updateUserRole from './updateUserRole.js'
import updateUserState from './updateUserState.js'
import userLogin from './userLogin.js'
import userLogout from './userLogout.js'
import userRegister from './userRegister.js'
import walletLogin from './walletLogin.js'

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
    resetWallet,
    generateLikerId,
    generateSigningMessage,
    resetLikerId,
    updateUserInfo,
    updateNotificationSetting,
    setCurrency,
    toggleBlockUser,
    toggleFollowTag,
    togglePinTag,
    toggleFollowUser,
    clearReadHistory,
    clearSearchHistory,
    updateUserState,
    updateUserRole,
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
  },
}
