import { VERIFICATION_CODE_STATUS } from 'common/enums/index.js'
import {
  CodeExpiredError,
  CodeInactiveError,
  CodeInvalidError,
} from 'common/errors.js'
import { MutationToConfirmVerificationCodeResolver } from 'definitions'

const resolver: MutationToConfirmVerificationCodeResolver = async (
  _,
  { input },
  { dataSources: { userService } }
) => {
  const { email: rawEmail } = input
  const email = rawEmail.toLowerCase()

  const codes = await userService.findVerificationCodes({
    where: { ...input, email },
  })
  const code = codes?.length > 0 ? codes[0] : {}

  if (code.status === VERIFICATION_CODE_STATUS.expired) {
    throw new CodeExpiredError('code is expired')
  }
  if (code.status === VERIFICATION_CODE_STATUS.inactive) {
    throw new CodeInactiveError('code is retired')
  }
  if (code.status !== VERIFICATION_CODE_STATUS.active) {
    throw new CodeInvalidError('code does not exists')
  }

  if (code.expiredAt < new Date()) {
    // mark code status as expired
    await userService.markVerificationCodeAs({
      codeId: code.id,
      status: VERIFICATION_CODE_STATUS.expired,
    })
    throw new CodeExpiredError('code is expired')
  }

  // mark code status as verified
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: VERIFICATION_CODE_STATUS.verified,
  })

  return code.uuid
}

export default resolver
