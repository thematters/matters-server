import {
  CodeInvalidError,
  EmailExistsError,
  UserNotFoundError,
} from 'common/errors'
import { MutationToChangeEmailResolver } from 'definitions'

import { updateDbEs } from './utils'

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
  { viewer, dataSources: { userService } }
) => {
  const oldEmail = rawOldEmail ? rawOldEmail.toLowerCase() : null
  const newEmail = rawNewEmail ? rawNewEmail.toLowerCase() : null

  const [oldCode] = await userService.findVerificationCodes({
    where: {
      uuid: oldEmailCodeId,
      email: oldEmail,
      type: 'email_reset',
      status: 'verified',
    },
  })
  const [newCode] = await userService.findVerificationCodes({
    where: {
      uuid: newEmailCodeId,
      email: newEmail,
      type: 'email_reset_confirm',
      status: 'verified',
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

  // update email
  const newUser = await updateDbEs(user.id, {
    email: newCode.email,
  })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: oldCode.id,
    status: 'used',
  })
  await userService.markVerificationCodeAs({
    codeId: newCode.id,
    status: 'used',
  })

  return newUser
}

export default resolver
