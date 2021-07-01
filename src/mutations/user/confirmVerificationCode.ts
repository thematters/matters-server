import { VERIFICATION_CODE_STATUS } from 'common/enums'
import { CodeExpiredError, CodeInvalidError } from 'common/errors'
import { MutationToConfirmVerificationCodeResolver } from 'definitions'

const resolver: MutationToConfirmVerificationCodeResolver = async (
  _,
  { input },
  { dataSources: { atomService, userService } }
) => {
  const { email: rawEmail } = input
  const email = rawEmail ? rawEmail.toLowerCase() : null

  // fetch the latest code sent to the email
  const [code] = await atomService.findMany({
    table: 'verification_code',
    where: { ...input, email },
    orderBy: [{ column: 'id', order: 'desc'}],
    take: 1,
  })

  if (
    !code ||
    code.status === VERIFICATION_CODE_STATUS.inactive ||
    code.status === VERIFICATION_CODE_STATUS.verified ||
    code.status === VERIFICATION_CODE_STATUS.used
  ) {
    throw new CodeInvalidError('code does not exists')
  }

  if (code.status === VERIFICATION_CODE_STATUS.expired) {
    throw new CodeExpiredError('code is exipred')
  }

  if (code.status !== VERIFICATION_CODE_STATUS.active) {
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
