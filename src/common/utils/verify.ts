import { environment, isTest } from 'common/environment'
import { gcp, cfsvc } from 'connectors'

// read MATTERS_VERIFY_CAPTCHA_TOKENS_THRESHOLDS="[0.5, 1.0]" as 2 numbers between [0,1)
// 0 to not verify token; 1 to always verify this token;
// check results of either one token pass

const GCP_RECAPTCHA_THRESHOLD =
  environment.verifyCaptchaTokenThresholds?.[0] || 1.0
const CFSVC_TURNSTILE_THRESHOLD =
  environment.verifyCaptchaTokenThresholds?.[1] || 1.0

// verify either gcp.recaptcha token or cfsvc.turnstile token, or both
// for a transition period, we may check both, and pass if any one pass siteverify
// after the transition period, can turn off the one no longer in use

// returns isHuman: boolean
export async function verifyCaptchaToken(token: string, ip: string) {
  if (isTest) {
    return true
  }

  // suppose it's space concatenated multiple tokens
  const tokens = (token || '').split(' ')

  return (
    (
      await Promise.allSettled(
        [
          Math.random() < GCP_RECAPTCHA_THRESHOLD &&
            gcp.recaptcha({ token: tokens?.[0] ?? token, ip }),
          Math.random() < CFSVC_TURNSTILE_THRESHOLD &&
            cfsvc.turnstileVerify({
              token: tokens?.[1] ?? tokens?.[0] ?? token,
              ip,
            }),
        ] // .map((p) => p.catch((e) => false))
      )
    ).filter((r) => r.status === 'fulfilled' && r.value === true).length > 0
  ) // includes(true)
}
