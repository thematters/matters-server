import { Router } from 'express'

import { TRANSACTION_STATE } from 'common/enums'
import logger from 'common/logger'
import { PaymentService } from 'connectors'

const service = new PaymentService()

const likecoinRouter = Router()

likecoinRouter.get('/', async (req, res) => {

  try {
    const { tx_hash, state } = req.query

    if (!tx_hash) {
      res.json({ result: 'payment failed' })
    }

    // get pending transaction
    const transactions = await service.findTransactions({
      providerTxId: state,
      limit: 1,
    })

    // update transaction state
    const results = await Promise.all(
      transactions.map(
        transaction => service.baseUpdate(transaction.id, {
          id: transaction.id,
          provider_tx_id: tx_hash,
          state: TRANSACTION_STATE.succeeded,
          updatedAt: new Date(),
        })
      )
    )
  } catch (error) {
    logger.error(error)
  }

  res.json({ result: 'payment successed' })
})

export default likecoinRouter
