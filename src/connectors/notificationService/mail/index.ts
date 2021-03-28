import { sendAdoptTag } from './sendAdoptTag'
import { sendAssignAsTagEditor } from './sendAssignAsTagEditor'
import { sendChurn } from './sendChurn'
import { sendCircleInvitation } from './sendCircleInvitation'
import { sendDailySummary } from './sendDailySummary'
import { sendMigrationSuccess } from './sendMigrationSuccess'
import { sendPayment } from './sendPayment'
import { sendRegisterSuccess } from './sendRegisterSuccess'
import { sendUserDeletedByAdmin } from './sendUserDeletedByAdmin'
import { sendVerificationCode } from './sendVerificationCode'

export const mail = {
  sendAdoptTag,
  sendAssignAsTagEditor,
  sendChurn,
  sendCircleInvitation,
  sendDailySummary,
  sendMigrationSuccess,
  sendRegisterSuccess,
  sendUserDeletedByAdmin,
  sendVerificationCode,
  sendPayment,
}
