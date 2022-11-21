import _filter from 'lodash/filter'
import _some from 'lodash/some'

import { VERIFICATION_CODE_STATUS } from 'common/enums'
import {
  CodeExpiredError,
  CodeInactiveError,
  CodeInvalidError,
  EmailExistsError,
  UserNotFoundError,
} from 'common/errors'
import {
  GQLVerificationCodeType,
  MutationToChangeEmailResolver,
} from 'definitions'

const resolver: MutationToChangeEmailResolver = async (
  _,
  {
    input: {
      oldEmail: rawOldEmail,
      oldEmailCodeId,
      newEmail: rawNewEmail,
      newEmailCodeId,
    },
  },
  { viewer, dataSources: { userService, atomService } }
) => {
  const oldEmail = rawOldEmail ? rawOldEmail.toLowerCase() : null
  const newEmail = rawNewEmail ? rawNewEmail.toLowerCase() : null

  const [oldCodes, newCodes] = await Promise.all([
    userService.findVerificationCodes({
      where: {
        uuid: oldEmailCodeId,
        email: oldEmail,
        type: GQLVerificationCodeType.email_reset,
      },
    }),
    userService.findVerificationCodes({
      where: {
        uuid: newEmailCodeId,
        email: newEmail,
        type: GQLVerificationCodeType.email_reset_confirm,
      },
    }),
  ])

  const verifiedOldCode = _filter(oldCodes, [
    'status',
    VERIFICATION_CODE_STATUS.verified,
  ])[0]
  const verifiedNewCode = _filter(newCodes, [
    'status',
    VERIFICATION_CODE_STATUS.verified,
  ])[0]

  // check codes
  const hasExpiredCode =
    _some(oldCodes, ['status', VERIFICATION_CODE_STATUS.expired]) ||
    _some(newCodes, ['status', VERIFICATION_CODE_STATUS.expired])
  const hasInactiveCode =
    _some(oldCodes, ['status', VERIFICATION_CODE_STATUS.inactive]) ||
    _some(newCodes, ['status', VERIFICATION_CODE_STATUS.inactive])

  if (hasExpiredCode) {
    throw new CodeExpiredError('code is exipred')
  }
  if (hasInactiveCode) {
    throw new CodeInactiveError('code is retired')
  }
  if (!verifiedOldCode || !verifiedNewCode) {
    throw new CodeInvalidError('code does not exists')
  }

  // check email
  const user = await userService.findByEmail(verifiedOldCode.email)
  if (!user) {
    throw new UserNotFoundError('target user does not exists')
  }

  // check new email
  const isNewEmailExisted = await userService.findByEmail(verifiedNewCode.email)
  if (isNewEmailExisted) {
    throw new EmailExistsError('email already exists')
  }

  const newUser = await atomService.update({
    table: 'user',
    where: { id: user.id },
    data: {
      email: verifiedNewCode.email,
    },
  })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: verifiedOldCode.id,
    status: VERIFICATION_CODE_STATUS.used,
  })
  await userService.markVerificationCodeAs({
    codeId: verifiedNewCode.id,
    status: VERIFICATION_CODE_STATUS.used,
  })

  return newUser
}

export default resolver
