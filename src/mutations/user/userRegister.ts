import { MutationToUserRegisterResolver } from 'definitions'
import { UserInputError, ForbiddenError } from 'apollo-server'
import {
  isValidEmail,
  isValidUserName,
  isValidDisplayName,
  isValidPassword
} from 'common/utils'

const resolver: MutationToUserRegisterResolver = async (
  root,
  { input },
  { dataSources: { userService } }
) => {
  const { email, userName, displayName, password, codeId } = input
  if (!email) {
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
  if (userName && !isValidUserName(userName)) {
    throw new Error('invalid user name')
  }
  if (!isValidDisplayName(displayName)) {
    throw new Error('invalid user display name')
  }
  if (!isValidPassword(password)) {
    throw new Error('invalid user password')
  }
  await userService.create(input)

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'used'
  })

  return userService.login(input)
}

export default resolver
