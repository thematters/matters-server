import { EMAIL_TEMPLATE_ID } from 'common/enums/index.js'
import { environment } from 'common/environment.js'
import { mailService } from 'connectors/index.js'
import { GQLVerificationCodeType, LANGUAGES } from 'definitions'

import { trans } from './utils.js'

export const sendVerificationCode = async ({
  to,
  type,
  code,
  redirectUrl,
  recipient,
  language = 'zh_hant',
}: {
  to: string
  type: GQLVerificationCodeType
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

  await mailService.send({
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
            register: type === GQLVerificationCodeType.register,
            emailReset: type === GQLVerificationCodeType.email_reset,
            emailResetConfirm:
              type === GQLVerificationCodeType.email_reset_confirm,
            passwordReset: type === GQLVerificationCodeType.password_reset,
            paymentPasswordReset:
              type === GQLVerificationCodeType.payment_password_reset,
          },
          recipient: {
            ...recipient,
            email: to,
          },
          ...(redirectUrl ? { link } : { code }),
        },
      },
    ],
    trackingSettings: {
      ganalytics: {
        enable: true,
        utmSource: 'matters',
        utmMedium: 'email',
        // utmTerm?: string;
        utmContent: type,
        // utmCampaign?: string;
      },
    },
  })
}
