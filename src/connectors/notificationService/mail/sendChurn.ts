import { EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES } from 'definitions'

import { trans } from './utils'

export const sendChurn = async ({
  to,
  language = 'zh_hant',
  recipient,
  type
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
}) => {
  const templateId = EMAIL_TEMPLATE_ID.churn[language]

  const articles = []
  switch (type) {
    case 'newRegisterCommentable':
      break
    case 'newRegisterUncommentable':
      break
    case 'mediumTermHasFollowees':
      break
    case 'mediumTermHasNotFollowees':
      break
  }

  notificationQueue.sendMail({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          subject: trans.churn[type](language, {
            displayName: recipient.displayName
          }),
          siteDomain: environment.siteDomain,
          recipient,
          articles
        }
      }
    ]
  })
}
