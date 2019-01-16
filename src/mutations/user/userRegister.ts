import { MutationToUserRegisterResolver } from 'definitions'
import { random } from 'lodash'
import { UserInputError, ForbiddenError } from 'apollo-server'
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
    throw new ForbiddenError('email address has already been registered')
  }
  // check display name
  if (!isValidDisplayName(displayName)) {
    throw new Error('invalid user display name')
  }
  // check password
  if (!isValidPassword(password)) {
    throw new Error('invalid user password')
  }

  // Programatically generate user name
  let retries = 0
  let mainName = makeUserName(email)
  let newUserName = mainName
  while (
    !isValidUserName(newUserName) ||
    (await userService.countUserNames(newUserName)) > 0
  ) {
    if (retries >= 50) {
      throw new Error('cannot generate user name')
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
