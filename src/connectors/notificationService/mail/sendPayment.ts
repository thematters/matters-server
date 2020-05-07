import { EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES } from 'definitions'

import { trans } from './utils'

export const sendPayment = async ({
  to,
  type,
  recipient,
  tx,
  language = 'zh_hant',
}: {
  to: string
  type:
    | 'passwordSet'
    | 'passwordChanged'
    | 'creditAdded'
    | 'donated'
    | 'receivedDonation'
    | 'receivedDonationLikeCoin'
  recipient: {
    displayName: string
    userName: string
  }
  tx?: {
    recipient: {
      displayName: string
      userName: string
    }
    sender?: {
      displayName: string
      userName: string
    }
    amount: string
  }
  language?: LANGUAGES
}) => {
  const templateId = EMAIL_TEMPLATE_ID.payment[language]
  const subject = trans.payment[type](language, {})

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
          type,
          recipient,
          tx,
        },
      },
    ],
  })
}
