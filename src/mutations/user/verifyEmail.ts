import { MutationToVerifyEmailResolver } from 'definitions'
import { CodeInvalidError, UserNotFoundError } from 'common/errors'

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
    throw new CodeInvalidError('code does not exists')
  }

  // check email
  const user = await userService.findByEmail(code.email)
  if (!user) {
    throw new UserNotFoundError('target user does not exists')
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
