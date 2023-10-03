import type { AuthMode, GQLMutationResolvers } from 'definitions'

import {
  VERIFICATION_CODE_STATUS,
  VERIFICATION_CODE_TYPE,
  AUTH_RESULT_TYPE,
} from 'common/enums'
import {
  CodeExpiredError,
  CodeInactiveError,
  CodeInvalidError,
  DisplayNameInvalidError,
  EmailExistsError,
  EmailInvalidError,
  NameExistsError,
  NameInvalidError,
  PasswordInvalidError,
} from 'common/errors'
import {
  getViewerFromUser,
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  isValidUserName,
  setCookie,
} from 'common/utils'

const resolver: GQLMutationResolvers['userRegister'] = async (
  _,
  { input },
  context
) => {
  const {
    dataSources: { userService },
    req,
    res,
  } = context
  const { email: rawEmail, userName, displayName, password, codeId } = input
  const email = rawEmail.toLowerCase()
  if (!isValidEmail(email, { allowPlusSign: false })) {
    throw new EmailInvalidError('invalid email address format')
  }

  // check verification code
  const codes = await userService.findVerificationCodes({
    where: {
      uuid: codeId,
      email,
      type: VERIFICATION_CODE_TYPE.register,
    },
  })
  const code = codes?.length > 0 ? codes[0] : {}

  // check code
  if (code.status === VERIFICATION_CODE_STATUS.expired) {
    throw new CodeExpiredError('code is expired')
  }
  if (code.status === VERIFICATION_CODE_STATUS.inactive) {
    throw new CodeInactiveError('code is retired')
  }
  if (code.status !== VERIFICATION_CODE_STATUS.verified) {
    throw new CodeInvalidError('code does not exists')
  }

  // check email
  const otherUser = await userService.findByEmail(email)
  if (otherUser) {
    throw new EmailExistsError('email address has already been registered')
  }

  // check display name
  // Note: We will use "userName" to pre-fill "displayName" in step-1 of signUp flow on website
  const shouldCheckDisplayName = displayName !== userName
  if (shouldCheckDisplayName && !isValidDisplayName(displayName)) {
    throw new DisplayNameInvalidError('invalid user display name')
  }

  // check password
  if (!isValidPassword(password)) {
    throw new PasswordInvalidError('invalid user password')
  }

  let newUserName
  if (userName) {
    if (!isValidUserName(userName.toLowerCase())) {
      throw new NameInvalidError('invalid user name')
    }

    if (await userService.checkUserNameExists(userName)) {
      throw new NameExistsError('user name already exists')
    }

    newUserName = userName
  } else {
    newUserName = await userService.generateUserName(email)
  }

  const newUser = await userService.create({
    ...input,
    email,
    emailVerified: true,
    userName: newUserName.toLowerCase(),
  })
  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: VERIFICATION_CODE_STATUS.used,
  })
  await userService.postRegister(newUser)

  const { token, user } = await userService.loginByEmail({ ...input, email })

  setCookie({ req, res, token, user })

  context.viewer = await getViewerFromUser(user)
  context.viewer.authMode = user.role as AuthMode
  context.viewer.scope = {}

  return {
    token,
    auth: true,
    type: AUTH_RESULT_TYPE.Signup,
    user,
  }
}

export default resolver
