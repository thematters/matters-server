import { EMAIL_TEMPLATE_ID, VERIFICATION_CODE_TYPES } from 'common/enums'
import { environment } from 'common/environment'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES } from 'definitions'

import { trans } from './utils'

export const sendVerificationCode = async ({
  to,
  type,
  code,
  recipient,
  language = 'zh_hant',
}: {
  to: string
  type: keyof typeof VERIFICATION_CODE_TYPES
  code: string
  recipient: {
    displayName?: string
  }
  language?: LANGUAGES
}) => {
  const templateId = EMAIL_TEMPLATE_ID.verificationCode[language]
  const codeTypeStr = trans.verificationCode[type](language, {})
  const subject = trans.verificationCode.subject(language, {
    type: codeTypeStr,
  })
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
          code,
          type: codeTypeStr,
          recipient,
        },
      },
    ],
  })
}
