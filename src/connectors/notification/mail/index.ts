import { sendCircleInvitation } from './sendCircleInvitation.js'
import { sendEmailChange } from './sendEmailChange.js'
import { sendMigrationSuccess } from './sendMigrationSuccess.js'
import { sendPayment } from './sendPayment.js'
import { sendRegisterSuccess } from './sendRegisterSuccess.js'
import { sendUserDeletedByAdmin } from './sendUserDeletedByAdmin.js'
import { sendVerificationCode } from './sendVerificationCode.js'

export const mail = {
  sendCircleInvitation,
  sendMigrationSuccess,
  sendRegisterSuccess,
  sendUserDeletedByAdmin,
  sendVerificationCode,
  sendPayment,
  sendEmailChange,
}
