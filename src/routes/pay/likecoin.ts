import type { EmailableUser } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'
import bodyParser from 'body-parser'
import { RequestHandler, Router } from 'express'
import NP from 'number-precision'

import {
  NODE_TYPES,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import { LikeCoinWebhookError } from 'common/errors'
import { getLogger } from 'common/logger'
import { AtomService, PaymentService, UserService } from 'connectors'

import { connections } from '../connections'

const logger = getLogger('route-likecoin')

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
    const result = await userService.baseFindEntityTypeTable(typeId)
    const type = NODE_TYPES[(result?.table as keyof typeof NODE_TYPES) || '']
    if (type) {
      await invalidateFQC({
        node: { type, id },
        redis: connections.redis,
      })
    }
  }
}

likecoinRouter.use(bodyParser.json() as RequestHandler)

likecoinRouter.get('/', async (req, res) => {
  const successRedirect = `https://${environment.siteDomain}/pay/likecoin/success`
  const failureRedirect = `https://${environment.siteDomain}/pay/likecoin/failure`

  const paymentService = new PaymentService(connections)

  const userService = new UserService(connections)

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
        providerTxId: state as string,
      })
    )[0]

    if (!tx) {
      throw new Error('could not found tx id passing from like pay')
    }

    // check like chain tx state
    const rate = Math.pow(10, 9)
    const cosmosData = await userService.likecoin.getCosmosTxData({
      hash: tx_hash as string,
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
        userService,
      })
      throw new Error('like pay failure')
    }

    // manaully invalidate cache
    invalidateCache({
      id: updatedTx.targetId,
      typeId: updatedTx.targetType,
      userService,
    })
  } catch (error) {
    logger.error(error)
    return res.redirect(failureRedirect)
  }

  return res.redirect(successRedirect)
})

/**
 * Basic Auth for Like Pay Webhook Events
 */
likecoinRouter.use(async (req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
  const secret = Buffer.from(b64auth, 'base64').toString()

  if (secret === environment.likecoinPayWebhookSecret) {
    next()
  } else {
    // deny webhook call
    res.set('WWW-Authenticate', 'Basic realm="incorrect webhook credential"')
    res.status(401).send('401 Unauthorized')
  }
})

/**
 * Handling Incoming Like Pay Webhook Events
 *
 * @see {@url https://docs.like.co/developer/like-pay/web-widget/webhook}
 */
likecoinRouter.post('/', async (req, res, next) => {
  const atomService = new AtomService(connections)
  const userService = new UserService(connections)
  const paymentService = new PaymentService(connections)
  let txHash = ''

  try {
    const { tx, metadata } = req.body
    if (!tx || !tx.txHash) {
      throw new LikeCoinWebhookError('callback has no "tx"')
    }
    txHash = tx.txHash

    if (!metadata) {
      throw new LikeCoinWebhookError('callback has no "metadata"')
    }

    const txState = metadata.likePay?.state || metadata.state || ''
    logger.info(`callback tx:${txHash}, state: ${txState}`)

    let trans = (
      await paymentService.findTransactions({
        providerTxId: tx.txHash,
      })
    )[0]

    if (!trans) {
      trans = (
        await paymentService.findTransactions({
          providerTxId: txState,
        })
      )[0]
    }

    // check like chain tx state
    // 1 like is 10^9 nanolike
    const rate = Math.pow(10, 9)
    const amount = tx.amount?.amount || 0
    const cosmosAmount = NP.divide(amount, rate)
    const cosmosState =
      tx.status === 'success'
        ? TRANSACTION_STATE.succeeded
        : tx.status === 'failed'
        ? TRANSACTION_STATE.failed
        : tx.status === 'timeout'
        ? TRANSACTION_STATE.failed
        : TRANSACTION_STATE.pending

    // if both state and txHash cannot be found in transaction table
    // try to add as a new transaction record
    let resultTx
    if (!trans) {
      const fromLikerId = tx.fromId
      const toLikerId = tx.toId //
      const fromUser = await userService.findByLikerId(fromLikerId)
      const toUser = await userService.findByLikerId(toLikerId)

      if (!fromUser) {
        throw new LikeCoinWebhookError(
          `cannot find sender for liker: ${fromLikerId}`
        )
      }
      if (!toUser) {
        throw new LikeCoinWebhookError(
          `cannot find recipient for liker: ${fromLikerId}`
        )
      }

      // insert transaction
      const createdTx = await paymentService.createTransaction({
        amount: cosmosAmount,
        fee: 0,
        state: cosmosState,
        purpose: TRANSACTION_PURPOSE.donation,
        currency: PAYMENT_CURRENCY.LIKE,
        provider: PAYMENT_PROVIDER.likecoin,
        providerTxId: tx.txHash,
        recipientId: toUser.id,
        senderId: fromUser.id,
        remark: `created via webhook: ${txState}`,
      })
      resultTx = createdTx
      logger.info(`likecoin tx created via webhook: ${createdTx.id}`)
    } else {
      const updateParams: Record<string, any> = {
        id: trans.id,
        provider_tx_id: tx.txHash,
        state: cosmosState,
        updatedAt: new Date(),
      }

      // check if webhook posted correct amount
      if (Math.round(trans.amount) !== cosmosAmount) {
        throw new LikeCoinWebhookError(
          `incorrect amount: ${trans.amount} != ${cosmosAmount}`
        )
      }

      // update transaction
      const updatedTx = await paymentService.baseUpdate(trans.id, updateParams)

      if (cosmosState === TRANSACTION_STATE.failed) {
        invalidateCache({
          id: updatedTx.targetId,
          typeId: updatedTx.targetType,
          userService,
        })
        throw new LikeCoinWebhookError(`like pay failure`)
      }
      resultTx = updatedTx
    }

    // notification
    const sender = resultTx.senderId
      ? await userService.baseFindById(resultTx.senderId)
      : null
    const recipient = await userService.baseFindById(resultTx.recipientId)
    const article = await atomService.findFirst({
      table: 'article',
      where: { id: resultTx.targetId },
    })

    if (sender && recipient) {
      await paymentService.notifyDonation({
        tx: resultTx,
        sender: sender as EmailableUser,
        recipient: recipient as EmailableUser,
        article,
      })
    }

    // manaully invalidate cache
    invalidateCache({
      id: resultTx.targetId,
      typeId: resultTx.targetType,
      userService,
    })

    res.json({ received: true })
  } catch (error) {
    const errMsg = `webhook err: ${error}, tx hash: ${txHash}, request: ${JSON.stringify(
      req.body
    )}`
    logger.error(errMsg)
    next(errMsg)
  }
})

export default likecoinRouter
