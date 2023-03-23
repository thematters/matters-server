import {
  BLOCKCHAIN,
  BLOCKCHAIN_CHAINID,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums/index.js'
import {
  ArticleService,
  mailService,
  PaymentService,
  UserService,
} from 'connectors/index.js'
import { GQLChain } from 'definitions'

import { createDonationTx } from './utils.js'

// setup mock
// jest.mock('connectors/index.js', () => {
//  return {
//    __esModule: true,
//    mailService: {
//      send: jest.fn(),
//    },
//  }
// })

// helpers

const genRandomProviderTxId = () => 'testProviderTxId' + Math.random()

// tests

describe('Transaction CRUD', () => {
  const paymentService = new PaymentService()

  const amount = 1
  const fee = 0.1
  const state = TRANSACTION_STATE.pending
  const purpose = TRANSACTION_PURPOSE.donation
  const currency = PAYMENT_CURRENCY.HKD
  const provider = PAYMENT_PROVIDER.matters
  const providerTxId = genRandomProviderTxId()
  const recipientId = '1'
  const senderId = '2'
  const targetId = '1'
  const targetType = TRANSACTION_TARGET_TYPE.article
  const remark = 'testRemark'
  const txHash =
    '0xd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae876f7be'
  const txHashUppercase =
    '0xD65DC6BF6DCC111237F9ACFBFA6003EA4A4D88F2E071F4307D3AF81AE876F7BE'
  const chain = BLOCKCHAIN.Polygon.valueOf() as GQLChain

  test('create Transaction', async () => {
    const txn = await paymentService.createTransaction({
      amount,
      fee,
      state,
      purpose,
      currency,
      provider,
      providerTxId,
      recipientId,
      senderId,
      targetId,
      targetType,
      remark,
    })
    expect(parseInt(txn.amount, 10)).toEqual(amount)
    expect(parseFloat(txn.fee)).toEqual(fee)
    expect(txn.state).toEqual(state)
    expect(txn.purpose).toEqual(purpose)
    expect(txn.currency).toEqual(currency)
    expect(txn.provider).toEqual(provider)
    expect(txn.providerTxId).toEqual(providerTxId)
    expect(txn.recipientId).toEqual(recipientId)
    expect(txn.senderId).toEqual(senderId)
    expect(txn.targetId).toEqual(targetId)
    expect(txn.targetType).toBeDefined()
    expect(txn.remark).toEqual(txn.remark)
  })
  test('get or create BlockchainTransaction', async () => {
    // create
    const blockchainTx = await paymentService.findOrCreateBlockchainTransaction(
      { chain, txHash }
    )
    expect(blockchainTx.chainId).toEqual(
      BLOCKCHAIN_CHAINID.Polygon.PolygonMumbai
    )
    expect(blockchainTx.txHash).toEqual(txHash)
    expect(blockchainTx.state).toEqual('pending')

    // get
    const blockchainTx2 =
      await paymentService.findOrCreateBlockchainTransaction({ chain, txHash })
    expect(blockchainTx2.id).toEqual(blockchainTx.id)
    // get with uppercase txHash
    const blockchainTx3 =
      await paymentService.findOrCreateBlockchainTransaction({
        chain,
        txHash: txHashUppercase,
      })
    expect(blockchainTx3.id).toEqual(blockchainTx.id)
  })
  test('get or create Transaction by Txhash', async () => {
    const txHash2 =
      '0xd65dc6bf6dcc111237f9acfbfa6003ea4a4d88f2e071f4307d3af81ae876f7bf'
    const currencyUSDT = PAYMENT_CURRENCY.USDT

    // create
    const txn = await paymentService.findOrCreateTransactionByBlockchainTxHash({
      chain,
      txHash: txHash2,
      amount,
      fee,
      state,
      purpose,
      currency: currencyUSDT,
      recipientId,
      senderId,
      targetId,
      targetType,
      remark,
    })
    const blockchainTx = await paymentService.findOrCreateBlockchainTransaction(
      {
        chain,
        txHash: txHash2,
      }
    )

    expect(parseInt(txn.amount, 10)).toEqual(amount)
    expect(parseFloat(txn.fee)).toEqual(fee)
    expect(txn.state).toEqual(state)
    expect(txn.purpose).toEqual(purpose)
    expect(txn.currency).toEqual(currencyUSDT)
    expect(txn.provider).toEqual(PAYMENT_PROVIDER.blockchain)
    expect(txn.providerTxId).toEqual(blockchainTx.id)
    expect(txn.recipientId).toEqual(recipientId)
    expect(txn.senderId).toEqual(senderId)
    expect(txn.targetId).toEqual(targetId)
    expect(txn.targetType).toBeDefined()
    expect(txn.remark).toEqual(txn.remark)

    expect(blockchainTx.transactionId).toBe(txn.id)

    // get
    const txn2 = await paymentService.findOrCreateTransactionByBlockchainTxHash(
      {
        chain,
        txHash: txHash2,
        amount,
        fee,
        state,
        purpose,
        currency: currencyUSDT,
        recipientId,
        senderId,
        targetId,
        targetType,
        remark,
      }
    )
    expect(txn2.id).toEqual(txn.id)
  })
  test('findTransactions with excludeCanceledLIKE', async () => {
    const canceledLikeTx = await paymentService.createTransaction({
      amount,
      fee,
      state: TRANSACTION_STATE.canceled,
      purpose,
      currency: PAYMENT_CURRENCY.LIKE,
      provider,
      providerTxId: genRandomProviderTxId(),
      recipientId,
      senderId,
      targetId,
      targetType,
      remark,
    })
    const goodLikeTx = await paymentService.createTransaction({
      amount,
      fee,
      state: TRANSACTION_STATE.succeeded,
      purpose,
      currency: PAYMENT_CURRENCY.LIKE,
      provider,
      providerTxId: genRandomProviderTxId(),
      recipientId,
      senderId,
      targetId,
      targetType,
      remark,
    })
    const allTxs = await paymentService.findTransactions({})
    expect(allTxs.map((tx) => tx.id)).toContain(canceledLikeTx.id)
    expect(allTxs.map((tx) => tx.id)).toContain(goodLikeTx.id)

    const excludedTxs = await paymentService.findTransactions({
      excludeCanceledLIKE: true,
    })
    expect(excludedTxs.map((tx) => tx.id)).not.toContain(canceledLikeTx.id)
    expect(excludedTxs.map((tx) => tx.id)).toContain(goodLikeTx.id)
  })
  test('findTransactions with purpose/currency', async () => {
    const canceledLikeTx = await paymentService.createTransaction({
      amount,
      fee,
      state: TRANSACTION_STATE.canceled,
      purpose,
      currency: PAYMENT_CURRENCY.LIKE,
      provider,
      providerTxId: genRandomProviderTxId(),
      recipientId,
      senderId,
      targetId,
      targetType,
      remark,
    })
    const donateLikeTx = await paymentService.createTransaction({
      amount,
      fee,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
      currency: PAYMENT_CURRENCY.LIKE,
      provider,
      providerTxId: genRandomProviderTxId(),
      recipientId,
      senderId,
      targetId,
      targetType,
      remark,
    })
    const payoutHKDTx = await paymentService.createTransaction({
      amount,
      fee,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.payout,
      currency: PAYMENT_CURRENCY.HKD,
      provider,
      providerTxId: genRandomProviderTxId(),
      recipientId,
      senderId,
      targetId,
      targetType,
      remark,
    })

    const allPurposesTxs = await paymentService.findTransactions({
      excludeCanceledLIKE: true,
    })
    expect(allPurposesTxs.map((tx) => tx.id)).toContain(donateLikeTx.id)
    expect(allPurposesTxs.map((tx) => tx.id)).toContain(payoutHKDTx.id)
    expect(allPurposesTxs.map((tx) => tx.id)).not.toContain(canceledLikeTx.id)

    // purpose
    const donationTxs = await paymentService.findTransactions({
      purpose: TRANSACTION_PURPOSE.donation,
      excludeCanceledLIKE: true,
    })
    expect(donationTxs.map((tx) => tx.id)).toContain(donateLikeTx.id)
    expect(donationTxs.map((tx) => tx.id)).not.toContain(payoutHKDTx.id)
    expect(donationTxs.map((tx) => tx.id)).not.toContain(canceledLikeTx.id)
    const payoutTxs = await paymentService.findTransactions({
      purpose: TRANSACTION_PURPOSE.payout,
      excludeCanceledLIKE: true,
    })
    expect(payoutTxs.map((tx) => tx.id)).not.toContain(donateLikeTx.id)
    expect(payoutTxs.map((tx) => tx.id)).toContain(payoutHKDTx.id)
    expect(payoutTxs.map((tx) => tx.id)).not.toContain(canceledLikeTx.id)

    // currency
    const likeTxs = await paymentService.findTransactions({
      currency: PAYMENT_CURRENCY.LIKE,
      excludeCanceledLIKE: true,
    })
    expect(likeTxs.map((tx) => tx.id)).toContain(donateLikeTx.id)
    expect(likeTxs.map((tx) => tx.id)).not.toContain(payoutHKDTx.id)
    expect(likeTxs.map((tx) => tx.id)).not.toContain(canceledLikeTx.id)
    const HKDTxs = await paymentService.findTransactions({
      currency: PAYMENT_CURRENCY.HKD,
      excludeCanceledLIKE: true,
    })
    expect(HKDTxs.map((tx) => tx.id)).not.toContain(donateLikeTx.id)
    expect(HKDTxs.map((tx) => tx.id)).toContain(payoutHKDTx.id)
    expect(HKDTxs.map((tx) => tx.id)).not.toContain(canceledLikeTx.id)
  })
})

describe('notifyDonation', () => {
  const paymentService = new PaymentService()
  const userService = new UserService()
  mailService.send = jest.fn()
  test('donationCount value is correct', async () => {
    const getDonationCount = () =>
      // @ts-ignore
      mailService.send.mock.calls[0][0].personalizations[0]
        .dynamic_template_data.tx.donationCount

    const articleService = new ArticleService()
    const sender = await userService.create({
      userName: 'sender',
      email: 'sender@example.com',
    })
    const recipient = await userService.create({
      userName: 'recipient',
      email: 'recipient@example.com',
    })
    const tx = await createDonationTx({
      senderId: sender.id,
      recipientId: recipient.id,
    })
    const article = await articleService.baseFindById('1')
    await paymentService.notifyDonation({ tx, sender, recipient, article })
    expect(getDonationCount()).toBe(1)

    // @ts-ignore
    mailService.send.mockClear()
    const tx2 = await createDonationTx({
      senderId: sender.id,
      recipientId: recipient.id,
    })
    await paymentService.notifyDonation({ tx: tx2, sender, recipient, article })
    expect(getDonationCount()).toBe(2)
  })
})
