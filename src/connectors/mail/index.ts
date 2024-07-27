// eslint-disable-next-line import/no-extraneous-dependencies
import { MailDataRequired } from '@sendgrid/helpers/classes/mail'

import { QUEUE_URL } from 'common/enums'
import { aws } from 'connectors'

class MailService {
  private aws: typeof aws
  public constructor() {
    this.aws = aws
  }

  public send = async (params: MailDataRequired, express = false) => {
    this.aws.sqsSendMessage({
      messageBody: params,
      queueUrl: express ? QUEUE_URL.expressMail : QUEUE_URL.mail,
    })
  }
}

export const mailService = new MailService()
