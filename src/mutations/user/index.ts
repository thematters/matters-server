import sendVerificationCode from './sendVerificationCode'
import confirmVerificationCode from './confirmVerificationCode'
import resetPassword from './resetPassword'
import changeEmail from './changeEmail'
import verifyEmail from './verifyEmail'
import userRegister from './userRegister'
import userLogin from './userLogin'
import userLogout from './userLogout'
import generateLikerId from './generateLikerId'
import updateUserInfo from './updateUserInfo'
import updateNotificationSetting from './updateNotificationSetting'
import followUser from './followUser'
import unfollowUser from './unfollowUser'
import clearReadHistory from './clearReadHistory'
import clearSearchHistory from './clearSearchHistory'
import updateUserState from './updateUserState'
import generateTempLikerIds from './generateTempLikerIds'
import transferLIKE from './transferLIKE'

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
    unfollowUser,
    clearReadHistory,
    clearSearchHistory,
    updateUserState,
    generateTempLikerIds,
    transferLIKE
  }
}
