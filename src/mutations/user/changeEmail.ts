import { VERIFICATION_CODE_STATUS } from 'common/enums'
import {
  AuthenticationError,
  CodeInvalidError,
  EmailExistsError,
  EmailNotFoundError,
  // UserInputError,
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
      // ethAddress,
      // signature,
      newEmail: rawNewEmail,
      newEmailCodeId,
    },
  },
  { viewer, dataSources: { userService, atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

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

  const user = await userService.baseFindById(viewer.id)

  if (!user) {
    throw new UserNotFoundError('target user does not exists')
  }

  // the email has to be null (at signup), or has to match the given oldEmail
  if (user.email && user.email !== oldEmail) {
    throw new EmailNotFoundError(
      'the provided oldemail does not match DB record'
    )
  }

  /* const user = ethAddress
    ? await userService.findByEthAddress(ethAddress)
    : // otherwise; check email
      await userService.findByEmail(oldCode.email)
  */

  // check new email
  const isNewEmailExisted = await userService.findByEmail(newCode.email)
  if (isNewEmailExisted) {
    throw new EmailExistsError('email already exists')
  }

  /* if (ethAddress && user.email) {
    // TODO: change email 2nd time should require signature?
    throw new EmailExistsError('email already exists')
  } */

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

  await Promise.all(
    [oldCode?.id, newCode?.id].filter(Boolean).map((codeId) =>
      userService.markVerificationCodeAs({
        codeId,
        status: VERIFICATION_CODE_STATUS.used,
      })
    )
  )

  return newUser
}

export default resolver
