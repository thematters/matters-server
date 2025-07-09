import { QUEUE_URL } from '#common/enums/index.js'
import { MailDataRequired } from '@sendgrid/helpers/classes/mail.js'

import { aws } from '../aws/index.js'

export class MailService {
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
