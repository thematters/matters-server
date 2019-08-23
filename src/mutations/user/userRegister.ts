import { MutationToUserRegisterResolver } from 'definitions'
import { random } from 'lodash'
import {
  EmailExistsError,
  EmailInvalidError,
  CodeInvalidError,
  DisplayNameInvalidError,
  PasswordInvalidError,
  UsernameInvalidError,
  UsernameExistsError
} from 'common/errors'
import {
  isValidEmail,
  isValidUserName,
  isValidDisplayName,
  isValidPassword,
  makeUserName,
  setCookie
} from 'common/utils'
import { USER_STATE } from 'common/enums'

const resolver: MutationToUserRegisterResolver = async (
  root,
  { input },
  { viewer, dataSources: { userService, notificationService }, res }
) => {
  const { email: rawEmail, userName, displayName, password, codeId } = input
  const email = rawEmail ? rawEmail.toLowerCase() : null
  if (!isValidEmail(email)) {
    throw new EmailInvalidError('invalid email address format')
  }

  // check verification code
  const [code] = await userService.findVerificationCodes({
    where: {
      uuid: codeId,
      email,
      type: 'register',
      status: 'verified'
    }
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
  if (!isValidDisplayName(displayName)) {
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
    let mainName = makeUserName(email)
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
    userName: newUserName
  })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'used'
  })

  const { token } = await userService.login({ ...input, email })

  setCookie({ res, token })

  return { token, auth: true }
}

export default resolver
