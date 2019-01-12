import { MutationToConfirmVerificationCodeResolver } from 'definitions'

const resolver: MutationToConfirmVerificationCodeResolver = async (
  _,
  { input },
  { viewer, dataSources: { userService } }
) => {
  const [code] = await userService.findVerificationCodes({
    where: { ...input, status: 'active' }
  })

  if (!code) {
    throw new Error('code does not exists')
  }

  if (code.expiredAt < new Date()) {
    // mark code status as expired
    await userService.markVerificationCodeAs({
      codeId: code.id,
      status: 'expired'
    })
    throw new Error('code is exipred')
  }

  // mark code status as verified
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'verified'
  })

  return code.uuid
}

export default resolver
