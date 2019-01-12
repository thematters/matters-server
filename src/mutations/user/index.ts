import sendVerificationCode from './sendVerificationCode'
import confirmVerificationCode from './confirmVerificationCode'
import resetPassword from './resetPassword'
import changeEmail from './changeEmail'
import verifyEmail from './verifyEmail'
import userRegister from './userRegister'
import userLogin from './userLogin'
import updateUserInfo from './updateUserInfo'
import updateNotificationSetting from './updateNotificationSetting'
import followUser from './followUser'
import unfollowUser from './unfollowUser'
import clearReadHistory from './clearReadHistory'
import invite from './invite'

export default {
  Mutation: {
    sendVerificationCode,
    confirmVerificationCode,
    resetPassword,
    changeEmail,
    verifyEmail,
    userRegister,
    userLogin,
    updateUserInfo,
    updateNotificationSetting,
    followUser,
    unfollowUser,
    clearReadHistory,
    invite
  }
}
