import sgMail from '@sendgrid/mail'

import { environment } from 'common/environment'

class MailService {
  mail: typeof sgMail

  constructor() {
    this.mail = this._setupSgMail()
  }

  _setupSgMail() {
    sgMail.setApiKey(environment.sgKey as string)
    return sgMail
  }

  send() {
    if (environment.env === 'test') {
      return
    }
  }
}

export default MailService
