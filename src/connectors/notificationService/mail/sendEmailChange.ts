import type { LANGUAGES } from 'definitions'

import { EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
import { mailService } from 'connectors'

import { trans } from './utils'

export const sendEmailChange = async ({
  to,
  newEmail,
  language,
}: {
  to: string
  newEmail: string
  language: LANGUAGES
}) => {
  const templateId = EMAIL_TEMPLATE_ID.emailChange[language]
  await mailService.send({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          subject: trans.emailChange(language, {}),
          siteDomain: environment.siteDomain,
          copyrightYear: new Date().getFullYear(),
          oldEmail: to,
          newEmail,
        },
      },
    ],
  })
}
