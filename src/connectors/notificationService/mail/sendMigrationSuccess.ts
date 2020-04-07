import { EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES } from 'definitions'

import { trans } from './utils'

export const sendMigrationSuccess = async ({
  to,
  language = 'zh_hant',
  recipient
}: {
  to: string
  language?: LANGUAGES
  recipient: {
    displayName: string
    userName: string
  }
}) => {
  const templateId = EMAIL_TEMPLATE_ID.migrationSuccess[language]
  notificationQueue.sendMail({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          subject: trans.migration(language, {}),
          siteDomain: environment.siteDomain,
          recipient
        }
      }
    ]
  })
}
