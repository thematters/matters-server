import type { LANGUAGES } from '#definitions/index.js'

import { EMAIL_TEMPLATE_ID } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { mailService } from '#connectors/index.js'

import { trans } from './utils.js'

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
