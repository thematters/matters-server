import { EMAIL_TEMPLATE_ID } from 'common/enums/index.js'
import { environment } from 'common/environment.js'
import { mailService } from 'connectors/index.js'
import { LANGUAGES } from 'definitions'

import { trans } from './utils.js'

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
  await mailService.send({
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
