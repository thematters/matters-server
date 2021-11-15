import { EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES } from 'definitions'

import { trans } from './utils'

export const sendCryptoWalletConnected = async ({
  cryptoWallet,
  language = 'zh_hant',
  recipient,
  to,
}: {
  cryptoWallet: {
    address: string
  }
  language?: LANGUAGES
  recipient: {
    displayName?: string
  }
  to: string
}) => {
  const templateId =
    language === 'en'
      ? EMAIL_TEMPLATE_ID.cryptoWalletConnectedEnglish[language]
      : EMAIL_TEMPLATE_ID.cryptoWalletConnected[language]
  notificationQueue.sendMail({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          cryptoWallet,
          recipient,
          siteDomain: environment.siteDomain,
          subject: trans.cryptoWallet.connected(language, {}),
        },
      },
    ],
  })
}
