import type { LANGUAGES } from 'definitions'

import { EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
import { mailService } from 'connectors'

import { trans } from './utils'

export const sendCircleInvitation = async ({
  code,
  circle,
  language = 'zh_hant',
  recipient,
  redirectUrl,
  sender,
  to,
}: {
  code?: string
  circle: {
    displayName: string
    freePeriod: number
    name: string
  }
  language?: LANGUAGES
  recipient: {
    displayName?: string
  }
  redirectUrl?: string
  sender: {
    displayName: string
  }
  to: string
}) => {
  const templateId = EMAIL_TEMPLATE_ID.circleInvitation[language]
  const urlHasQs = redirectUrl && redirectUrl.indexOf('?') >= 0
  const registerLink = code
    ? `${redirectUrl}${urlHasQs ? '&' : '?'}code=${code}&type=${
        "register"
      }`
    : undefined
  const circleLink = code
    ? undefined
    : `https://${environment.siteDomain}/~${circle.name}`

  await mailService.send({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          circle,
          circleLink,
          code,
          recipient,
          registerLink,
          sender,
          siteDomain: environment.siteDomain,
          copyrightYear: new Date().getFullYear(),
          subject: trans.circle.invitation(language, {
            sender: sender.displayName,
            circle: circle.displayName,
          }),
        },
      },
    ],
  })
}
