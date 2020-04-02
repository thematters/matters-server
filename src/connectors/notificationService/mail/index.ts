import { sendChurn } from './sendChurn'
import { sendDailySummary } from './sendDailySummary'
import { sendMigrationSuccess } from './sendMigrationSuccess'
import { sendRegisterSuccess } from './sendRegisterSuccess'
import { sendUserDeletedByAdmin } from './sendUserDeletedByAdmin'
import { sendVerificationCode } from './sendVerificationCode'

export const mail = {
  sendChurn,
  sendDailySummary,
  sendMigrationSuccess,
  sendRegisterSuccess,
  sendUserDeletedByAdmin,
  sendVerificationCode,
}
