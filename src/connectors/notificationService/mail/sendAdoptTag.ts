import { EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
import { mailService } from 'connectors'
import { LANGUAGES, UserHasUsername } from 'definitions'

import { trans } from './utils'

export const sendAdoptTag = async ({
  to,
  language = 'zh_hant',
  recipient,
  tag,
}: {
  to: string
  language?: LANGUAGES
  recipient: Pick<UserHasUsername, 'displayName' | 'userName'>
  tag: {
    id: string
    content: string
  }
}) => {
  const templateId = EMAIL_TEMPLATE_ID.adoptTag[language]
  await mailService.send({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          subject: trans.tag.adoptTag(language, {
            displayName: recipient.displayName,
            content: tag.content,
          }),
          siteDomain: environment.siteDomain,
          copyrightYear: new Date().getFullYear(),
          recipient,
          tag,
        },
      },
    ],
  })
}
