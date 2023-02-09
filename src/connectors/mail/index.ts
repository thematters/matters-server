import { MailDataRequired } from '@sendgrid/helpers/classes/mail'

import { QUEUE_URL } from 'common/enums'
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
    return this.aws.sqsSendMessage({
      messageBody: params,
      queueUrl: QUEUE_URL.mail,
    })
  }
}

export const mailService = new MailService()
