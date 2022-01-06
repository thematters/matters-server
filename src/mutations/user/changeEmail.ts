import { VERIFICATION_CODE_STATUS } from 'common/enums'
import {
  CodeInvalidError,
  EmailExistsError,
  UserInputError,
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
      ethAddress,
      // signature
      newEmail: rawNewEmail,
      newEmailCodeId,
    },
  },
  { viewer, dataSources: { userService, atomService } }
) => {
  const oldEmail = rawOldEmail ? rawOldEmail.toLowerCase() : null
  const newEmail = rawNewEmail ? rawNewEmail.toLowerCase() : null

  let oldCode
  if (oldEmail && oldEmailCodeId) {
    ;[oldCode] = await userService.findVerificationCodes({
      where: {
        uuid: oldEmailCodeId,
        email: oldEmail,
        type: GQLVerificationCodeType.email_reset,
        status: VERIFICATION_CODE_STATUS.verified,
      },
    })
  }

  const [newCode] = await userService.findVerificationCodes({
    where: {
      uuid: newEmailCodeId,
      email: newEmail,
      type: GQLVerificationCodeType.email_reset_confirm,
      status: VERIFICATION_CODE_STATUS.verified,
    },
  })

  // check codes
  if (!newCode) {
    throw new CodeInvalidError('new code does not exists')
  }

  if (!oldCode && !ethAddress) {
    throw new UserInputError('change by either oldemail or ethAddress')
  }

  const user = ethAddress
    ? await userService.findByEthAddress(ethAddress)
    : // otherwise; check email
      await userService.findByEmail(oldCode.email)

  if (!user) {
    throw new UserNotFoundError('target user does not exists')
  }

  // check new email
  const isNewEmailExisted = await userService.findByEmail(newCode.email)
  if (isNewEmailExisted) {
    throw new EmailExistsError('email already exists')
  }

  if (ethAddress && user.email) {
    // TODO: change email 2nd time should require signature?
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
  if (oldCode) {
    await userService.markVerificationCodeAs({
      codeId: oldCode.id,
      status: VERIFICATION_CODE_STATUS.used,
    })
  }
  await userService.markVerificationCodeAs({
    codeId: newCode.id,
    status: VERIFICATION_CODE_STATUS.used,
  })

  return newUser
}

export default resolver
