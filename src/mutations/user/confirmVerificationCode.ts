import _filter from 'lodash/filter'
import _some from 'lodash/some'

import { VERIFICATION_CODE_STATUS } from 'common/enums'
import {
  CodeExpiredError,
  CodeInactiveError,
  CodeInvalidError,
} from 'common/errors'
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
  const verifiedCode = _filter(codes, [
    'status',
    VERIFICATION_CODE_STATUS.verified,
  ])[0]

  if (_some(codes, ['status', VERIFICATION_CODE_STATUS.expired])) {
    throw new CodeExpiredError('code is exipred')
  }
  if (_some(codes, ['status', VERIFICATION_CODE_STATUS.inactive])) {
    throw new CodeInactiveError('code is retired')
  }
  if (!verifiedCode) {
    throw new CodeInvalidError('code does not exists')
  }

  if (verifiedCode.expiredAt < new Date()) {
    // mark code status as expired
    await userService.markVerificationCodeAs({
      codeId: verifiedCode.id,
      status: VERIFICATION_CODE_STATUS.expired,
    })
    throw new CodeExpiredError('code is exipred')
  }

  // mark code status as verified
  await userService.markVerificationCodeAs({
    codeId: verifiedCode.id,
    status: VERIFICATION_CODE_STATUS.verified,
  })

  return verifiedCode.uuid
}

export default resolver
