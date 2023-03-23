import { sendAdoptTag } from './sendAdoptTag.js'
import { sendAssignAsTagEditor } from './sendAssignAsTagEditor.js'
import { sendCircleInvitation } from './sendCircleInvitation.js'
import { sendMigrationSuccess } from './sendMigrationSuccess.js'
import { sendPayment } from './sendPayment.js'
import { sendRegisterSuccess } from './sendRegisterSuccess.js'
import { sendUserDeletedByAdmin } from './sendUserDeletedByAdmin.js'
import { sendVerificationCode } from './sendVerificationCode.js'

export const mail = {
  sendAdoptTag,
  sendAssignAsTagEditor,
  sendCircleInvitation,
  sendMigrationSuccess,
  sendRegisterSuccess,
  sendUserDeletedByAdmin,
  sendVerificationCode,
  sendPayment,
}
