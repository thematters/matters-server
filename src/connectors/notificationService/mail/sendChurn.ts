import { EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
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
    displayName: string
  }
  type:
    | 'newRegisterCommentable'
    | 'newRegisterUncommentable'
    | 'mediumTermHasFollowees'
    | 'mediumTermHasNotFollowees'
  articles: any[]
}) => {
  const templateId = EMAIL_TEMPLATE_ID.churn[language]
  const subject = trans.churn[type](language, {
    displayName: recipient.displayName
  })

  console.log(articles, subject)

  return
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
          articles
        }
      }
    ]
  })
}
