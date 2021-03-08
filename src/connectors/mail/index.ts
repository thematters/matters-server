import { MailDataRequired } from '@sendgrid/helpers/classes/mail'
import sgMail from '@sendgrid/mail'

import { environment, isTest } from 'common/environment'

class MailService {
  mail: typeof sgMail

  constructor() {
    this.mail = this.__setup()
  }

  __setup = () => {
    sgMail.setApiKey(environment.sgKey as string)
    return sgMail
  }

  send = async (params: MailDataRequired) => {
    if (isTest) {
      return
    }

    await this.mail.send({
      ...params,
      // mailSettings: {
      //   sandboxMode: {
      //     enable: isDev
      //   }
      // }
      trackingSettings: {
        ganalytics: {
          enable: false,
        },
        clickTracking: {
          enable: false,
        },
      },
    })
  }
}

export const mailService = new MailService()
