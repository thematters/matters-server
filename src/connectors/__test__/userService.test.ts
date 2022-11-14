import {
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { PaymentService, UserService } from 'connectors'

const userService = new UserService()

describe('countDonators', () => {
  test('not existed recipientId', async () => {
    const recipientId = '0'
    const count = await userService.countDonators(recipientId)
    expect(count).toBe(0)
  })
  test('exsited recpientId but not donators', async () => {
    const recipientId = '1'
    const count = await userService.countDonators(recipientId)
    expect(count).toBe(0)
  })
  test('count donators', async () => {
    const recipientId = '1'

    await createDonationTx({ recipientId, senderId: '2' })

    const count1 = await userService.countDonators(recipientId)
    expect(count1).toBe(1)

    // distinct donators
    await createDonationTx({ recipientId, senderId: '2' })
    const count2 = await userService.countDonators(recipientId)
    expect(count2).toBe(1)
    const tx3 = await createDonationTx({ recipientId, senderId: '3' })
    const count3 = await userService.countDonators(recipientId)
    expect(count3).toBe(2)

    // count with range
    const tx4 = await createDonationTx({ recipientId, senderId: '4' })
    const count4 = await userService.countDonators(recipientId)
    expect(count4).toBe(3)
    const count5 = await userService.countDonators(recipientId, {start:tx3.createdAt, end: tx4.createdAt})
    expect(count5).toBe(1)
  })
})

// helpers
const createDonationTx = async ({
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
