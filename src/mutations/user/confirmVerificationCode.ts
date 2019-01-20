import { MutationToConfirmVerificationCodeResolver } from 'definitions'
import {
  UserInputError,
  CodeExpiredError,
  CodeInvalidError
} from 'common/errors'

const resolver: MutationToConfirmVerificationCodeResolver = async (
  _,
  { input },
  { viewer, dataSources: { userService } }
) => {
  const [code] = await userService.findVerificationCodes({
    where: { ...input, status: 'active' }
  })

  if (!code) {
    throw new CodeInvalidError('code does not exists')
  }

  if (code.expiredAt < new Date()) {
    // mark code status as expired
    await userService.markVerificationCodeAs({
      codeId: code.id,
      status: 'expired'
    })
    throw new CodeExpiredError('code is exipred')
  }

  // mark code status as verified
  await userService.markVerificationCodeAs({
    codeId: code.id,
    status: 'verified'
  })

  return code.uuid
}

export default resolver
