import { MutationToUserRegisterResolver } from 'definitions'
import { random } from 'lodash'
import { UserInputError, ForbiddenError, EmailExistsError } from 'common/errors'
import {
  isValidEmail,
  isValidUserName,
  isValidDisplayName,
  isValidPassword,
  makeUserName
} from 'common/utils'

const resolver: MutationToUserRegisterResolver = async (
  root,
  { input },
  { dataSources: { userService } }
) => {
  const { email: rawEmail, userName, displayName, password, codeId } = input
  const email = rawEmail ? rawEmail.toLowerCase() : null
  if (!isValidEmail(email)) {
    throw new Error('invalid email address format')
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
    throw new UserInputError('code does not exists')
  }

  // check email
  const user = await userService.findByEmail(email)
  if (user) {
    throw new EmailExistsError('email address has already been registered')
  }
  // check display name
  if (!isValidDisplayName(displayName)) {
    throw new UserInputError('invalid user display name', { displayName })
  }
  // check password
  if (!isValidPassword(password)) {
    throw new UserInputError('invalid user password', { password })
  }

  // Programatically generate user name
  let retries = 0
  let mainName = makeUserName(email)
  let newUserName = mainName
  while (
    !isValidUserName(newUserName) ||
    (await userService.countUserNames(newUserName)) > 0
  ) {
    if (retries >= 20) {
      throw new UserInputError('cannot generate user name', {
        email,
        displayName
      })
    }
    newUserName = `${mainName}${random(1, 999)}`
    retries += 1
  }

  await userService.create({ ...input, email, userName: newUserName })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'used'
  })

  return userService.login(input)
}

export default resolver
