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
}) =>
  createTx({
    senderId,
    recipientId,
    purpose: TRANSACTION_PURPOSE.donation,
    currency: PAYMENT_CURRENCY.HKD,
    state: TRANSACTION_STATE.succeeded,
  })

export const createTx = async ({
  senderId,
  recipientId,
  purpose,
  currency,
  state,
}: {
  senderId: string
  recipientId: string
  purpose: TRANSACTION_PURPOSE
  currency: PAYMENT_CURRENCY
  state: TRANSACTION_STATE
}) => {
  const paymentService = new PaymentService()
  return paymentService.createTransaction({
    amount: 1,
    fee: 0,
    purpose,
    currency,
    state,
    provider: PAYMENT_PROVIDER.matters,
    providerTxId: String(Math.random()),
    recipientId,
    senderId,
    targetId: '1',
    targetType: TRANSACTION_TARGET_TYPE.article,
  })
}
