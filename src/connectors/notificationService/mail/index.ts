import { sendCircleInvitation } from './sendCircleInvitation'
import { sendEmailChange } from './sendEmailChange'
import { sendMigrationSuccess } from './sendMigrationSuccess'
import { sendPayment } from './sendPayment'
import { sendRegisterSuccess } from './sendRegisterSuccess'
import { sendUserDeletedByAdmin } from './sendUserDeletedByAdmin'
import { sendVerificationCode } from './sendVerificationCode'

export const mail = {
  sendCircleInvitation,
  sendMigrationSuccess,
  sendRegisterSuccess,
  sendUserDeletedByAdmin,
  sendVerificationCode,
  sendPayment,
  sendEmailChange,
}
