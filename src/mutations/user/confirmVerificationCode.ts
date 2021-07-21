import { CodeExpiredError, CodeInvalidError } from 'common/errors'
import { MutationToConfirmVerificationCodeResolver } from 'definitions'

const resolver: MutationToConfirmVerificationCodeResolver = async (
  _,
  { input },
  { dataSources: { userService } }
) => {
  const { email: rawEmail } = input
  const email = rawEmail.toLowerCase()
  const [code] = await userService.findVerificationCodes({
    where: { ...input, email, status: 'active' },
  })

  if (!code) {
    throw new CodeInvalidError('code does not exists')
  }

  if (code.expiredAt < new Date()) {
    // mark code status as expired
    await userService.markVerificationCodeAs({
      codeId: code.id,
      status: 'expired',
    })
    throw new CodeExpiredError('code is exipred')
  }

  // mark code status as verified
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'verified',
  })

  return code.uuid
}

export default resolver
