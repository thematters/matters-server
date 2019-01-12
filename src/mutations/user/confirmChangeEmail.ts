import { MutationToConfirmChangeEmailResolver } from 'definitions'

const resolver: MutationToConfirmChangeEmailResolver = async (
  _,
  { input: { oldEmail, oldEmailCodeId, newEmail, newEmailCodeId } },
  { viewer, dataSources: { userService } }
) => {
  const [oldCode] = await userService.findVerificationCodes({
    where: {
      uuid: oldEmailCodeId,
      email: oldEmailCodeId,
      status: 'verified'
    }
  })
  const [newCode] = await userService.findVerificationCodes({
    where: {
      uuid: newEmailCodeId,
      email: newEmailCodeId,
      status: 'verified'
    }
  })

  // check codes
  if (!oldCode || !newCode) {
    throw new Error('code does not exists')
  }

  // check email
  const user = await userService.findByEmail(oldCode.email)
  if (!user) {
    throw new Error('target user does not exists')
  }

  // update email
  await userService.update(user.id, { email: newEmail })

  // mark code status as used
  await userService.markVerificationCodeAs({
    codeId: oldCode.id,
    status: 'used'
  })
  await userService.markVerificationCodeAs({
    codeId: newCode.id,
    status: 'used'
  })

  return true
}

export default resolver
