import { SOCIAL_LOGIN_TYPE } from 'common/enums'
import { isProd } from 'common/environment'
import {
  CodeExpiredError,
  CodeInvalidError,
  UnknownError,
  CodeInactiveError,
  OAuthTokenInvalidError,
} from 'common/errors'

const PASSPHREASE_EXPIRED = 'e2ets-loent-loent-loent-loent-expir'
const PASSPHREASE_MISMATCH = 'e2ets-loent-loent-loent-loent-misma'
const PASSPHREASE_UNKNOWN = 'e2ets-loent-loent-loent-loent-unkno'

const CODE_NOT_EXIST = 'e2etest_code_not_exists'
const CODE_RETIRED = 'e2etest_code_retired'
const CODE_EXPIRED = 'e2etest_code_expired'

export const checkIfE2ETest = (emailOrAuthCode: string) => {
  if (isProd) {
    return false
  }
  const isE2ETestEmail = /e2etest.*@matters.town/.test(emailOrAuthCode)
  const isE2ETestOauthCode = /e2etestcode-.*/.test(emailOrAuthCode)

  return isE2ETestEmail || isE2ETestOauthCode
}

export const throwIfE2EMagicToken = (token: string) => {
  if (token === PASSPHREASE_EXPIRED) {
    throw new CodeExpiredError('passphrases expired')
  } else if (token === PASSPHREASE_MISMATCH) {
    throw new CodeInvalidError('passphrases mismatch')
  } else if (token === PASSPHREASE_UNKNOWN) {
    throw new UnknownError('unknown error')
  } else if (token === CODE_NOT_EXIST) {
    throw new CodeInvalidError('code does not exists')
  } else if (token === CODE_RETIRED) {
    throw new CodeInactiveError('code is retired')
  } else if (token === CODE_EXPIRED) {
    throw new CodeExpiredError('code is expired')
  }
}

export const throwOrReturnUserInfo = (
  code: string,
  type: keyof typeof SOCIAL_LOGIN_TYPE
) => {
  if (code === 'e2etestcode-unknown') {
    throw new UnknownError(`exchange ${type} token failed`)
  } else if (code === 'e2etestcode-invalid') {
    throw new OAuthTokenInvalidError(`exchange ${type} token failed`)
  }
  if (type === SOCIAL_LOGIN_TYPE.Google) {
    return {
      id: code,
      email: `${code}@gmail.com`,
      emailVerified: true,
    }
  } else if (type === SOCIAL_LOGIN_TYPE.Facebook) {
    return {
      id: code,
      username: code,
    }
  } else if (type === SOCIAL_LOGIN_TYPE.Twitter) {
    return {
      id: code,
      username: code,
    }
  }
}
