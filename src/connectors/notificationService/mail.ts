import sgMail from '@sendgrid/mail'
import { MailData } from '@sendgrid/helpers/classes/mail'

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
}

export default MailService
