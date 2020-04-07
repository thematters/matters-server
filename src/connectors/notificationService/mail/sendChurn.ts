import { EMAIL_TEMPLATE_ID, LOG_RECORD_TYPES } from 'common/enums'
import { environment } from 'common/environment'
import { SystemService } from 'connectors'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES } from 'definitions'

import { trans } from './utils'

export const sendChurn = async ({
  to,
  language = 'zh_hant',
  recipient,
  type,
  articles
}: {
  to: string
  language?: LANGUAGES
  recipient: {
    id: string
    displayName: string
  }
  type:
    | 'newRegisterCommentable'
    | 'newRegisterUncommentable'
    | 'mediumTermHasFollowees'
    | 'mediumTermHasNotFollowees'
  articles: any[]
}) => {
  const systemService = new SystemService()
  const templateId = EMAIL_TEMPLATE_ID.churn[language]
  const subject = trans.churn[type](language, {
    displayName: recipient.displayName
  })

  notificationQueue.sendMail({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          subject,
          siteDomain: environment.siteDomain,
          recipient,
          type: {
            newRegisterCommentable: type === 'newRegisterCommentable',
            newRegisterUncommentable: type === 'newRegisterUncommentable',
            mediumTermHasFollowees: type === 'mediumTermHasFollowees',
            mediumTermHasNotFollowees: type === 'mediumTermHasNotFollowees'
          },
          articles
        }
      }
    ]
  })

  // Mark as sent
  const logRecordType =
    type.indexOf('newRegister') >= 0
      ? LOG_RECORD_TYPES.SentNewRegisterChurnEmail
      : LOG_RECORD_TYPES.SentMediumTermChurnEmail
  systemService.logRecord({ type: logRecordType, userId: recipient.id })
}
