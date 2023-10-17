import { EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
import { mailService } from 'connectors'
import { LANGUAGES, User } from 'definitions'

import { trans } from './utils'

export const sendUserDeletedByAdmin = async ({
  to,
  recipient,
  language = 'zh_hant',
}: {
  to: string
  recipient: Pick<User, 'displayName'>
  language?: LANGUAGES
}) => {
  const templateId = EMAIL_TEMPLATE_ID.userDeleted[language]
  await mailService.send({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          subject: trans.userDeleted(language, {}),
          siteDomain: environment.siteDomain,
          copyrightYear: new Date().getFullYear(),
          recipient,
        },
      },
    ],
  })
}
