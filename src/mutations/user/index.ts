import sendVerificationCode from './sendVerificationCode'
import confirmVerificationCode from './confirmVerificationCode'
import confirmResetPassword from './confirmResetPassword'
import confirmChangeEmail from './confirmChangeEmail'
import confirmVerifyEmail from './confirmVerifyEmail'
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
    confirmResetPassword,
    confirmChangeEmail,
    confirmVerifyEmail,
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
