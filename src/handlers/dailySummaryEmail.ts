import { DailySummaryEmailService } from '#connectors/dailySummaryEmailService.js'
import { mailService } from '#connectors/mail/index.js'

import { connections } from '../connections.js'

const dailySummaryEmailService = new DailySummaryEmailService(
  connections,
  mailService
)

export const handler = async () => {
  await dailySummaryEmailService.sendDailySummaryEmails()
}
