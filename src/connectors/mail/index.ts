// eslint-disable-next-line import/no-extraneous-dependencies
import { MailDataRequired } from '@sendgrid/helpers/classes/mail'

import { QUEUE_URL } from 'common/enums'
import { aws } from 'connectors'

class MailService {
  aws: typeof aws
  constructor() {
    this.aws = aws
  }

  send = async (params: MailDataRequired, express = false) =>
    this.aws.sqsSendMessage({
      messageBody: params,
      queueUrl: express ? QUEUE_URL.expressMail : QUEUE_URL.mail,
    })
}

export const mailService = new MailService()
