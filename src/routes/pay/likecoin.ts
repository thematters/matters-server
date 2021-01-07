import { invalidateFQC } from '@matters/apollo-response-cache'
import { Router } from 'express'
import NP from 'number-precision'

import { DB_NOTICE_TYPE, NODE_TYPES, TRANSACTION_STATE } from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { numRound } from 'common/utils'
import {
  CacheService,
  NotificationService,
  PaymentService,
  UserService,
} from 'connectors'

const likecoinRouter = Router()

const invalidateCache = async ({
  id,
  typeId,
  userService,
}: {
  id: string
  typeId: string
  userService: InstanceType<typeof UserService>
}) => {
  if (typeId) {
    const cache = new CacheService()
    const result = await userService.baseFindEntityTypeTable(typeId)
    const type = NODE_TYPES[(result?.table as keyof typeof NODE_TYPES) || '']
    if (type) {
      await invalidateFQC({
        node: { type, id },
        redis: cache.redis,
      })
    }
  }
}

likecoinRouter.get('/', async (req, res) => {
  const successRedirect = `${environment.siteDomain}/pay/likecoin/success`
  const failureRedirect = `${environment.siteDomain}/pay/likecoin/failure`

  const userService = new UserService()
  const paymentService = new PaymentService()
  const notificationService = new NotificationService()

  try {
    const { tx_hash, state, success } = req.query

    if (!tx_hash) {
      throw new Error('callback has no "tx_hash"')
    }

    if (!state) {
      throw new Error('callback has no "state"')
    }

    if (!success) {
      throw new Error('callback has no "success"')
    }

    // get pending transaction
    const tx = (
      await paymentService.findTransactions({
        providerTxId: state,
      })
    )[0]

    if (!tx) {
      throw new Error('could not found tx id passing from like pay')
    }

    // check like chain tx state
    const rate = Math.pow(10, 9)
    const cosmosData = await userService.likecoin.getCosmosTxData({
      hash: tx_hash,
    })
    const cosmosAmount = NP.divide(cosmosData.amount, rate)
    const cosmosState =
      success === 'true'
        ? TRANSACTION_STATE.succeeded
        : TRANSACTION_STATE.failed
    const updateParams: Record<string, any> = {
      id: tx.id,
      provider_tx_id: tx_hash,
      state: cosmosState,
      updatedAt: new Date(),
    }

    // correct amount if it changed via LikePay
    if (tx.amount !== cosmosAmount) {
      updateParams.amount = cosmosAmount
    }

    // update transaction
    const updatedTx = await paymentService.baseUpdate(tx.id, updateParams)

    if (cosmosState === TRANSACTION_STATE.failed) {
      invalidateCache({
        id: updatedTx.targetId,
        typeId: updatedTx.targetType,
        userService
      })
      throw new Error('like pay failure')
    }

    /**
     * trigger notifications
     */
    const sender = await userService.baseFindById(updatedTx.senderId)
    const recipient = await userService.baseFindById(updatedTx.recipientId)

    // send to sender
    notificationService.mail.sendPayment({
      to: sender.email,
      recipient: {
        displayName: sender.displayName,
        userName: sender.userName,
      },
      type: 'donated',
      tx: {
        recipient,
        sender,
        amount: numRound(updatedTx.amount),
        currency: updatedTx.currency,
      },
    })

    // send to recipient
    notificationService.trigger({
      event: DB_NOTICE_TYPE.payment_received_donation,
      actorId: sender.id,
      recipientId: recipient.id,
      entities: [
        {
          type: 'target',
          entityTable: 'transaction',
          entity: updatedTx,
        },
      ],
    })
    notificationService.mail.sendPayment({
      to: recipient.email,
      recipient: {
        displayName: recipient.displayName,
        userName: recipient.userName,
      },
      type: 'receivedDonationLikeCoin',
      tx: {
        recipient,
        sender,
        amount: numRound(updatedTx.amount),
        currency: updatedTx.currency,
      },
    })

    // manaully invalidate cache
    invalidateCache({
      id: updatedTx.targetId,
      typeId: updatedTx.targetType,
      userService
    })
  } catch (error) {
    logger.error(error)
    return res.redirect(failureRedirect)
  }

  return res.redirect(successRedirect)
})

export default likecoinRouter
