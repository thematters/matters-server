import { environment } from '#common/environment.js'
import { UserRetentionService, SendmailFn } from '#connectors/index.js'
import { SQS, SendMessageCommand } from '@aws-sdk/client-sqs'

import { connections } from '../connections.js'

const userRetentionService = new UserRetentionService(connections)

export const handler = async () => {
  const client = new SQS({ region: process.env.AWS_REGION })
  const sendmail: SendmailFn = async (userId, lastSeen, type) => {
    try {
      await client.send(
        new SendMessageCommand({
          QueueUrl: environment.userRetentionSendmailQueueUrl,
          MessageBody: JSON.stringify({ userId, lastSeen, type }),
        })
      )
    } catch (error) {
      console.error(error)
    }
  }

  await userRetentionService.processUserRetention({
    intervalInDays: environment.userRetentionIntervalInDays,
    sendmail,
  })
}
