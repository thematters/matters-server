import type { LANGUAGES, UserHasUsername } from '#definitions/index.js'

import { EMAIL_TEMPLATE_ID } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { mailService } from '#connectors/index.js'

import { trans } from './utils.js'

export const sendPayment = async ({
  to,
  type,
  recipient,
  tx,
  article,
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
    | 'payout'
  recipient: Pick<UserHasUsername, 'displayName' | 'userName'>
  tx?: {
    recipient?: Pick<UserHasUsername, 'displayName' | 'userName'>
    sender?: Pick<UserHasUsername, 'displayName' | 'userName'>
    amount: number
    currency: string
    donationCount?: number
  }
  article?: {
    id: string
    title: string
    slug: string
    mediaHash: string
    author: Pick<UserHasUsername, 'displayName' | 'userName'>
    hasReplyToDonator?: boolean
  }
  language: LANGUAGES
}) => {
  const templateId = EMAIL_TEMPLATE_ID.payment[language]
  const subject = trans.payment[type](language, {})

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
          copyrightYear: new Date().getFullYear(),
          type: {
            passwordSet: type === 'passwordSet',
            passwordChanged: type === 'passwordChanged',
            creditAdded: type === 'creditAdded',
            donated: type === 'donated',
            receivedDonation: type === 'receivedDonation',
            receivedDonationLikeCoin: type === 'receivedDonationLikeCoin',
            payout: type === 'payout',
          },
          recipient,
          tx,
          article,
        },
      },
    ],
  })
}
