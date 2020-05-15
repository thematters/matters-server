import { random } from 'lodash'

import { USER_STATE } from 'common/enums'
import {
  CodeInvalidError,
  DisplayNameInvalidError,
  EmailExistsError,
  EmailInvalidError,
  PasswordInvalidError,
  UsernameExistsError,
  UsernameInvalidError,
} from 'common/errors'
import {
  isValidDisplayName,
  isValidEmail,
  isValidPassword,
  isValidUserName,
  makeUserName,
  setCookie,
} from 'common/utils'
import { MutationToUserRegisterResolver } from 'definitions'

const resolver: MutationToUserRegisterResolver = async (
  root,
  { input },
  { viewer, dataSources: { userService, notificationService }, res }
) => {
  const { email: rawEmail, userName, displayName, password, codeId } = input
  const email = rawEmail ? rawEmail.toLowerCase() : null
  if (!isValidEmail(email, { allowPlusSign: false })) {
    throw new EmailInvalidError('invalid email address format')
  }

  // check verification code
  const [code] = await userService.findVerificationCodes({
    where: {
      uuid: codeId,
      email,
      type: 'register',
      status: 'verified',
    },
  })
  if (!code) {
    throw new CodeInvalidError('code does not exists')
  }

  // check email
  const user = await userService.findByEmail(email)
  if (user) {
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
    if (!isValidUserName(userName)) {
      throw new UsernameInvalidError('invalid user name')
    }

    if (await userService.countUserNames(userName)) {
      throw new UsernameExistsError('user name already exists')
    }

    newUserName = userName
  } else {
    // Programatically generate user name
    let retries = 0
    const mainName = makeUserName(email)
    newUserName = mainName
    while (
      !isValidUserName(newUserName) ||
      (await userService.countUserNames(newUserName)) > 0
    ) {
      if (retries >= 20) {
        throw new UsernameInvalidError('cannot generate user name')
      }
      newUserName = `${mainName}${random(1, 999)}`
      retries += 1
    }
  }

  await userService.create({
    ...input,
    email,
    userName: newUserName,
  })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'used',
  })

  // send email
  notificationService.mail.sendRegisterSuccess({
    to: email,
    recipient: {
      displayName,
    },
    language: viewer.language,
  })

  const { token } = await userService.login({ ...input, email })

  setCookie({ res, token })

  return { token, auth: true }
}

export default resolver
