import { sendAdoptTag } from './sendAdoptTag'
import { sendAssignAsTagEditor } from './sendAssignAsTagEditor'
import { sendCircleInvitation } from './sendCircleInvitation'
import { sendCryptoWalletAirdrop } from './sendCryptoWalletAirdrop'
import { sendCryptoWalletConnected } from './sendCryptoWalletConnected'
import { sendDailySummary } from './sendDailySummary'
import { sendMigrationSuccess } from './sendMigrationSuccess'
import { sendPayment } from './sendPayment'
import { sendRegisterSuccess } from './sendRegisterSuccess'
import { sendUserDeletedByAdmin } from './sendUserDeletedByAdmin'
import { sendVerificationCode } from './sendVerificationCode'

export const mail = {
  sendAdoptTag,
  sendAssignAsTagEditor,
  sendCircleInvitation,
  sendDailySummary,
  sendMigrationSuccess,
  sendRegisterSuccess,
  sendUserDeletedByAdmin,
  sendVerificationCode,
  sendPayment,
  sendCryptoWalletAirdrop,
  sendCryptoWalletConnected,
}
