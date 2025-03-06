import { isTest } from 'common/environment.js'
import { cfsvc } from 'connectors/index.js'

// returns isHuman: boolean
export async function verifyCaptchaToken(token: string, ip: string) {
  if (isTest) {
    return true
  }

  // suppose it's space concatenated multiple tokens
  const tokens = (token || '').split(' ')

  return cfsvc.turnstileVerify({
    token: tokens?.[1] ?? tokens?.[0] ?? token,
    ip,
  })
}
