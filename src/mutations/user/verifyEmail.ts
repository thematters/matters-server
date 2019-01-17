import { MutationToVerifyEmailResolver } from 'definitions'
import { UserInputError } from 'apollo-server'

const resolver: MutationToVerifyEmailResolver = async (
  _,
  { input: { codeId: uuid } },
  { viewer, dataSources: { userService } }
) => {
  const [code] = await userService.findVerificationCodes({
    where: {
      uuid,
      type: 'email_verify',
      status: 'verified'
    }
  })

  // check code
  if (!code) {
    throw new UserInputError('code does not exists')
  }

  // check email
  const user = await userService.findByEmail(code.email)
  if (!user) {
    throw new UserInputError('target user does not exists')
  }

  // change password
  await userService.updateInfo(user.id, { emailVerified: true })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'used'
  })

  return true
}

export default resolver
