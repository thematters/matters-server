import { EMAIL_TEMPLATE_ID, VERIFICATION_CODE_TYPE } from 'common/enums'
import { environment } from 'common/environment'
import { mailService } from 'connectors'
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
  type: keyof typeof VERIFICATION_CODE_TYPE
  code: string
  redirectUrl?: string
  recipient: {
    displayName: string | null
  }
  language?: LANGUAGES
}) => {
  const templateId = EMAIL_TEMPLATE_ID.verificationCode[language]
  const subject = trans.verificationCode[type](language, {})

  // construct email verification link
  const hasQs = redirectUrl && redirectUrl.indexOf('?') >= 0
  const link = `${redirectUrl}${hasQs ? '&' : '?'}code=${code}&type=${type}`

  await mailService.send(
    {
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore https://github.com/sendgrid/sendgrid-nodejs/issues/729
          dynamic_template_data: {
            subject,
            siteDomain: environment.siteDomain,
            copyrightYear: new Date().getFullYear(),
            type: {
              register: type === VERIFICATION_CODE_TYPE.register,
              emailReset: type === VERIFICATION_CODE_TYPE.email_reset,
              emailResetConfirm:
                type === VERIFICATION_CODE_TYPE.email_reset_confirm,
              passwordReset: type === VERIFICATION_CODE_TYPE.password_reset,
              paymentPasswordReset:
                type === VERIFICATION_CODE_TYPE.payment_password_reset,
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
    },
    true
  )
}
