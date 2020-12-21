import { invalidateFQC } from '@matters/apollo-response-cache'
import { Router } from 'express'

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

likecoinRouter.get('/', async (req, res) => {
  const successRedirect = `${environment.siteDomain}/pay/likecoin/success`
  const failureRedirect = `${environment.siteDomain}/pay/likecoin/failure`

  const userService = new UserService()
  const paymentService = new PaymentService()
  const notificationService = new NotificationService()

  try {
    const { tx_hash, state } = req.query

    if (!tx_hash) {
      throw new Error('callback has no "tx_hash"')
    }

    if (!state) {
      throw new Error('callback has no "state"')
    }

    // get pending transaction
    const tx = (
      await paymentService.findTransactions({
        providerTxId: state,
      })
    )[0]

    // mark transaction state as "succeeded"
    paymentService.baseUpdate(tx.id, {
      id: tx.id,
      provider_tx_id: tx_hash,
      state: TRANSACTION_STATE.succeeded,
      updatedAt: new Date(),
    })

    /**
     * trigger notifications
     */
    const sender = await userService.baseFindById(tx.senderId)
    const recipient = await userService.baseFindById(tx.recipientId)

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
        amount: numRound(tx.amount),
        currency: tx.currency,
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
          entity: tx,
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
        amount: numRound(tx.amount),
        currency: tx.currency,
      },
    })

    // manaully invalidate cache
    if (tx.targetType) {
      const cacheService = new CacheService()
      const entityResult = await userService.baseFindEntityTypeTable(
        tx.targetType
      )
      const targetType =
        NODE_TYPES[(entityResult?.table as keyof typeof NODE_TYPES) || '']
      if (targetType) {
        await invalidateFQC({
          node: { type: targetType, id: tx.targetId },
          redis: cacheService.redis,
        })
      }
    }
  } catch (error) {
    logger.error(error)
    return res.redirect(failureRedirect)
  }

  return res.redirect(successRedirect)
})

export default likecoinRouter
