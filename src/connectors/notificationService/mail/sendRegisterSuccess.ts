import { EMAIL_TEMPLATE_ID } from 'common/enums/index.js'
import { environment } from 'common/environment.js'
import { mailService } from 'connectors/index.js'
import { LANGUAGES } from 'definitions'

import { trans } from './utils.js'

export const sendRegisterSuccess = async ({
  to,
  recipient,
  language = 'zh_hant',
}: {
  to: string
  recipient: {
    displayName?: string
  }
  language?: LANGUAGES
}) => {
  const templateId = EMAIL_TEMPLATE_ID.registerSuccess[language]
  await mailService.send({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          subject: trans.registerSuccess(language, {}),
          siteDomain: environment.siteDomain,
          recipient,
        },
      },
    ],
  })
}
