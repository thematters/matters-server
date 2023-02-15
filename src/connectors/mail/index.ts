import { MailDataRequired } from '@sendgrid/helpers/classes/mail'

import { environment, isTest } from 'common/environment'
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
      queueUrl: environment.awsMailQueueUrl,
    })
  }
}

export const mailService = new MailService()
