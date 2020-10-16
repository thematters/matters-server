import { EMAIL_TEMPLATE_ID, VERIFICATION_CODE_TYPES } from 'common/enums'
import { environment } from 'common/environment'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES } from 'definitions'

import { trans } from './utils'

export const sendVerificationCode = async ({
  to,
  type,
  code,
  redirectUrl,
  recipient,
  language = 'zh_hant',
}: {
  to: string
  type: keyof typeof VERIFICATION_CODE_TYPES
  code: string
  redirectUrl?: string
  recipient: {
    displayName?: string
  }
  language?: LANGUAGES
}) => {
  const templateId = EMAIL_TEMPLATE_ID.verificationCode[language]
  const subject = trans.verificationCode[type](language, {})

  // construct email verification link
  const hasQs = redirectUrl && redirectUrl.indexOf('?') >= 0
  const link = `${redirectUrl}${hasQs ? '&' : '?'}code=${code}&type=${type}`

  notificationQueue.sendMail({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore https://github.com/sendgrid/sendgrid-nodejs/issues/729
        dynamic_template_data: {
          subject,
          siteDomain: environment.siteDomain,
          type: {
            register: type === VERIFICATION_CODE_TYPES.register,
            emailReset: type === VERIFICATION_CODE_TYPES.email_reset,
            emailResetConfirm:
              type === VERIFICATION_CODE_TYPES.email_reset_confirm,
            passwordReset: type === VERIFICATION_CODE_TYPES.password_reset,
            paymentPasswordReset:
              type === VERIFICATION_CODE_TYPES.payment_password_reset,
          },
          recipient: {
            ...recipient,
            email: to,
          },
          ...(redirectUrl ? { link } : { code }),
        },
      },
    ],
  })
}
