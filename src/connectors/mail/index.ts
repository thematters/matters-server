import { MailDataRequired } from '@sendgrid/helpers/classes/mail'

import { isTest } from 'common/environment'
import { aws } from 'connectors'

class MailService {
  aws: typeof aws
  constructor() {
    this.aws = aws
  }

  send = async (params: MailDataRequired) => {
    if (isTest) {
      return
    }
  }
}

export const mailService = new MailService()
// export const notificationQueue = new NotificationQueue()
