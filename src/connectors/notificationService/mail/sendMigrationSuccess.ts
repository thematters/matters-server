import { EMAIL_TEMPLATE_ID } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import { mailService } from '#connectors/index.js'
import { LANGUAGES, UserHasUsername } from '#definitions/index.js'

import { trans } from './utils.js'

export const sendMigrationSuccess = async ({
  to,
  language = 'zh_hant',
  recipient,
}: {
  to: string
  language?: LANGUAGES
  recipient: Pick<UserHasUsername, 'displayName' | 'userName'>
}) => {
  const templateId = EMAIL_TEMPLATE_ID.migrationSuccess[language]
  await mailService.send({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          subject: trans.migration(language, {}),
          siteDomain: environment.siteDomain,
          copyrightYear: new Date().getFullYear(),
          recipient,
        },
      },
    ],
  })
}
