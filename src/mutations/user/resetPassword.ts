import { CodeInvalidError, UserNotFoundError } from 'common/errors'
import { MutationToResetPasswordResolver } from 'definitions'

const resolver: MutationToResetPasswordResolver = async (
  _,
  { input: { password, codeId: uuid } },
  { viewer, dataSources: { userService } }
) => {
  const [code] = await userService.findVerificationCodes({
    where: {
      uuid,
      type: 'password_reset',
      status: 'verified',
    },
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
  await userService.changePassword({ userId: user.id, password })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'used',
  })

  return true
}

export default resolver
