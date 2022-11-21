import _filter from 'lodash/filter'
import _some from 'lodash/some'

import { VERIFICATION_CODE_STATUS } from 'common/enums'
import {
  CodeExpiredError,
  CodeInactiveError,
  CodeInvalidError,
  ForbiddenError,
  PasswordInvalidError,
  UserNotFoundError,
} from 'common/errors'
import { isValidPassword, isValidPaymentPassword } from 'common/utils'
import {
  GQLVerificationCodeType,
  MutationToResetPasswordResolver,
} from 'definitions'

const resolver: MutationToResetPasswordResolver = async (
  _,
  { input: { password, codeId: uuid, type } },
  { dataSources: { userService, notificationService } }
) => {
  const codes = await userService.findVerificationCodes({
    where: {
      uuid,
      type:
        type === 'payment'
          ? GQLVerificationCodeType.payment_password_reset
          : GQLVerificationCodeType.password_reset,
    },
  })

  const verifiedCode = _filter(codes, [
    'status',
    VERIFICATION_CODE_STATUS.verified,
  ])[0]

  // check code
  if (_some(codes, ['status', VERIFICATION_CODE_STATUS.expired])) {
    throw new CodeExpiredError('code is exipred')
  }
  if (_some(codes, ['status', VERIFICATION_CODE_STATUS.inactive])) {
    throw new CodeInactiveError('code is retired')
  }
  if (!verifiedCode) {
    throw new CodeInvalidError('code does not exists')
  }

  // check email
  const user = await userService.findByEmail(verifiedCode.email)
  if (!user) {
    throw new UserNotFoundError('target user does not exists')
  }

  // check password
  if (type === 'payment') {
    if (!isValidPaymentPassword(password)) {
      throw new PasswordInvalidError(
        'invalid payment password, should be 6 digits.'
      )
    }
  } else {
    // forbid wallet login user to (re)set password
    if (!user.passwordHash) {
      throw new ForbiddenError('wallet user cannot reset account password')
    }

    if (!isValidPassword(password)) {
      throw new PasswordInvalidError('invalid user password')
    }
  }

  // change account or payment password
  await userService.changePassword({ userId: user.id, password, type })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: verifiedCode.id,
    status: VERIFICATION_CODE_STATUS.used,
  })

  // trigger notifications
  if (type === 'payment') {
    notificationService.mail.sendPayment({
      to: user.email,
      recipient: {
        displayName: user.displayName,
        userName: user.userName,
      },
      type: 'passwordChanged',
    })
  }

  return true
}

export default resolver
