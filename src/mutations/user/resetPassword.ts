import {
  CodeInvalidError,
  PasswordInvalidError,
  UserNotFoundError,
} from 'common/errors'
import { isValidPassword, isValidPaymentPassword } from 'common/utils'
import { MutationToResetPasswordResolver } from 'definitions'

const resolver: MutationToResetPasswordResolver = async (
  _,
  { input: { password, codeId: uuid, type } },
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

  // check password
  if (type === 'payment') {
    if (isValidPaymentPassword(password)) {
      throw new PasswordInvalidError('invalid payment password')
    }
  } else {
    if (!isValidPassword(password)) {
      throw new PasswordInvalidError('invalid user password')
    }
  }

  // change account or payment password
  await userService.changePassword({ userId: user.id, password, type })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'used',
  })

  return true
}

export default resolver
