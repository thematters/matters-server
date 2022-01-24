import { VERIFICATION_CODE_STATUS } from 'common/enums'
import {
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

  const [oldCode] = await userService.findVerificationCodes({
    where: {
      uuid: oldEmailCodeId,
      email: oldEmail,
      type: GQLVerificationCodeType.email_reset,
      status: VERIFICATION_CODE_STATUS.verified,
    },
  })
  const [newCode] = await userService.findVerificationCodes({
    where: {
      uuid: newEmailCodeId,
      email: newEmail,
      type: GQLVerificationCodeType.email_reset_confirm,
      status: VERIFICATION_CODE_STATUS.verified,
    },
  })

  // check codes
  if (!oldCode || !newCode) {
    throw new CodeInvalidError('code does not exists')
  }

  // check email
  const user = await userService.findByEmail(oldCode.email)
  if (!user) {
    throw new UserNotFoundError('target user does not exists')
  }

  // check new email
  const isNewEmailExisted = await userService.findByEmail(newCode.email)
  if (isNewEmailExisted) {
    throw new EmailExistsError('email already exists')
  }

  const newUser = await atomService.update({
    table: 'user',
    where: { id: user.id },
    data: {
      email: newCode.email,
    },
  })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: oldCode.id,
    status: VERIFICATION_CODE_STATUS.used,
  })
  await userService.markVerificationCodeAs({
    codeId: newCode.id,
    status: VERIFICATION_CODE_STATUS.used,
  })

  return newUser
}

export default resolver
