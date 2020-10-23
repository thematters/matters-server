import { EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES } from 'definitions'

import { trans } from './utils'

export const sendAssignAsTagEditor = async ({
  to,
  language = 'zh_hant',
  recipient,
  sender,
  tag,
}: {
  to: string
  language?: LANGUAGES
  recipient: {
    displayName: string
    userName: string
  }
  sender: {
    displayName: string
    userName: string
  }
  tag: {
    id: string
    content: string
  }
}) => {
  const templateId = EMAIL_TEMPLATE_ID.assignAsTagEditor[language]
  notificationQueue.sendMail({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          subject: trans.tag.assignAsTagEditor(language, {
            displayName: recipient.displayName,
            content: tag.content,
          }),
          siteDomain: environment.siteDomain,
          recipient,
          sender,
          tag,
        },
      },
    ],
  })
}
