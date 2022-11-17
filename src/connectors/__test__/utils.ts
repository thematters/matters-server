import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { PaymentService } from 'connectors'

export const createDonationTx = async ({
  senderId,
  recipientId,
}: {
  senderId: string
  recipientId: string
}) => {
  const paymentService = new PaymentService()
  return paymentService.createTransaction({
    amount: 1,
    fee: 0,
    state: TRANSACTION_STATE.succeeded,
    purpose: TRANSACTION_PURPOSE.donation,
    currency: PAYMENT_CURRENCY.HKD,
    provider: PAYMENT_PROVIDER.matters,
    providerTxId: String(Math.random()),
    recipientId,
    senderId,
    targetId: '1',
    targetType: TRANSACTION_TARGET_TYPE.article,
  })
}
