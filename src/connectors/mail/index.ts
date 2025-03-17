import { QUEUE_URL } from '#common/enums/index.js'
import { aws } from '#connectors/index.js'
import { MailDataRequired } from '@sendgrid/helpers/classes/mail.js'

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
