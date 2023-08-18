import { invalidateFQC } from '@matters/apollo-response-cache'
import Queue from 'bull'
import _capitalize from 'lodash/capitalize'

import {
  BLOCKCHAIN,
  BLOCKCHAIN_SAFE_CONFIRMS,
  BLOCKCHAIN_TRANSACTION_STATE,
  MINUTE,
  NODE_TYPES,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  SLACK_MESSAGE_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_REMARK,
  TRANSACTION_STATE,
} from 'common/enums'
import {
  environment,
  isProd,
  polygonUSDTContractAddress,
  polygonUSDTContractDecimals,
} from 'common/environment'
import { PaymentQueueJobDataError, UnknownError } from 'common/errors'
import { fromTokenBaseUnit, toTokenBaseUnit } from 'common/utils'
import { PaymentService, redis } from 'connectors'
import { CurationContract, CurationEvent, Log } from 'connectors/blockchain'
import SlackService from 'connectors/slack'
import { EmailableUser } from 'definitions'

import { BaseQueue } from '../baseQueue'

interface PaymentParams {
  txId: string
}

export class PayToByBlockchainQueue extends BaseQueue {
  paymentService: InstanceType<typeof PaymentService>
  slackService: InstanceType<typeof SlackService>
  delay: number

  constructor() {
    super(QUEUE_NAME.payToByBlockchain)
    this.paymentService = new PaymentService()
    this.slackService = new SlackService()
    this.addConsumers()
    this.delay = 5000 // 5s
  }

  /**
   * Producers
   *
   */
  payTo = ({ txId }: PaymentParams) =>
    this.q.add(
      QUEUE_JOB.payTo,
      { txId },
      {
        delay: this.delay,
        attempts: 8, // roughly total 20 min before giving up
        backoff: {
          type: 'exponential',
          delay: this.delay,
        },
        priority: QUEUE_PRIORITY.NORMAL,
      }
    )

  addRepeatJobs = async () => {
    this.q.add(
      QUEUE_JOB.syncCurationEvents,
      {},
      {
        priority: QUEUE_PRIORITY.NORMAL,
        repeat: { every: isProd ? MINUTE * 30 : MINUTE * 10 },
      }
    )
  }

  /**
   * Consumers
   *
   */
  private addConsumers = () => {
    this.q.process(
      QUEUE_JOB.payTo,
      QUEUE_CONCURRENCY.payToByBlockchain,
      this.handlePayTo
    )
    this.q.process(
      QUEUE_JOB.syncCurationEvents,
      1,
      this.handleSyncCurationEvents
    )
  }

  /**
   * Pay-to handler.
   *
   */
  private handlePayTo: Queue.ProcessCallbackFunction<unknown> = async (job) => {
    const data = job.data as PaymentParams
    const txId = data.txId

    const tx = await this.paymentService.baseFindById(txId)
    if (!tx) {
      job.discard()
      throw new PaymentQueueJobDataError('pay-to pending tx not found')
    }

    if (tx.provider !== PAYMENT_PROVIDER.blockchain) {
      job.discard()
      throw new PaymentQueueJobDataError('wrong pay-to queue')
    }

    const blockchainTx =
      await this.paymentService.findBlockchainTransactionById(tx.providerTxId)

    if (!blockchainTx) {
      job.discard()
      throw new PaymentQueueJobDataError('blockchain transaction not found')
    }

    const curation = new CurationContract()
    const txReceipt = await curation.fetchTxReceipt(blockchainTx.txHash)

    if (!txReceipt) {
      throw new PaymentQueueJobDataError('blockchain transaction not mined')
    }

    if (txReceipt.reverted) {
      await this.failBothTxAndBlockchainTx(txId, blockchainTx.id)
      return data
    }
    const [recipient, sender, article] = await Promise.all([
      this.userService.baseFindById(tx.recipientId),
      this.userService.baseFindById(tx.senderId),
      this.atomService.findFirst({
        table: 'article',
        where: { id: tx.targetId },
      }),
    ])

    const creatorAddress = recipient.ethAddress
    const curatorAddress = sender.ethAddress
    const cid = article.dataHash
    const tokenAddress = polygonUSDTContractAddress
    const amount = tx.amount
    const decimals = polygonUSDTContractDecimals

    // txReceipt does not match with tx record in database
    if (
      !(await this.containMatchedEvent(txReceipt.events, {
        creatorAddress,
        curatorAddress,
        cid,
        tokenAddress,
        amount,
        decimals,
      }))
    ) {
      await this.updateTxAndBlockchainTxState(
        {
          txId,
          txState: TRANSACTION_STATE.canceled,
          txRemark: TRANSACTION_REMARK.INVALID,
        },
        {
          blockchainTxId: blockchainTx.id,
          blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
        }
      )
      return data
    }

    // update pending tx
    await this.succeedBothTxAndBlockchainTx(txId, blockchainTx.id)

    // notification
    await this.paymentService.notifyDonation({ tx, sender, recipient, article })

    await this.invalidCache(tx.targetType, tx.targetId)
    job.progress(100)

    return data
  }

  /**
   * syncCurationEvents handler.
   *
   */
  private handleSyncCurationEvents: Queue.ProcessCallbackFunction<unknown> =
    async (_) => {
      let syncedBlocknum: number
      try {
        syncedBlocknum = await this._handleSyncCurationEvents()
      } catch (error) {
        this.slackService.sendQueueMessage({
          data: { error },
          title: `${QUEUE_NAME.payToByBlockchain}:${QUEUE_JOB.syncCurationEvents}`,
          message: `'Failed to sync Polygon curation events`,
          state: SLACK_MESSAGE_STATE.failed,
        })
        throw error
      }
      return syncedBlocknum
    }

  private _handleSyncCurationEvents = async () => {
    // fetch events
    const syncRecordTable = 'blockchain_sync_record'
    const curation = new CurationContract()
    const chainId = curation.chainId
    const contractAddress = curation.address
    const record = await this.atomService.findFirst({
      table: syncRecordTable,
      where: { chainId, contractAddress },
    })
    const oldSavepoint = record
      ? parseInt(record.blockNumber, 10)
      : parseInt(environment.polygonCurationContractBlocknum, 10)
    const [logs, newSavepoint] = await this.fetchCurationLogs(
      curation,
      oldSavepoint
    )

    // update tx state and save events
    await this.syncCurationEvents(logs)

    // save progress
    await this.atomService.upsert({
      table: syncRecordTable,
      where: { chainId, contractAddress },
      update: { chainId, contractAddress, blockNumber: newSavepoint },
      create: { chainId, contractAddress, blockNumber: newSavepoint },
    })

    return newSavepoint
  }

  private handleNewEvent = async (
    log: Log<CurationEvent>,
    blockchainTx: {
      id: string
      transactionId: string
      state: BLOCKCHAIN_TRANSACTION_STATE
    }
  ) => {
    const event = log.event
    // related tx record has resolved
    if (
      blockchainTx.transactionId &&
      blockchainTx.state === BLOCKCHAIN_TRANSACTION_STATE.succeeded
    ) {
      return
    }

    // check if donation is from Matters
    if (
      !ignoreCaseMatch(event.tokenAddress || '', polygonUSDTContractAddress) ||
      !isValidUri(event.uri)
    ) {
      return
    }
    const curatorUser = await this.userService.findByEthAddress(
      event.curatorAddress
    )
    if (!curatorUser) {
      return
    }
    const creatorUser = await this.userService.findByEthAddress(
      event.creatorAddress
    )
    if (!creatorUser) {
      return
    }
    const cid = extractCid(event.uri)
    const articles = await this.articleService.baseFind({
      where: { author_id: creatorUser.id, data_hash: cid },
    })
    if (articles.length === 0) {
      return
    }
    const article = articles[0]

    // donation is from Matters
    const amount = parseFloat(
      fromTokenBaseUnit(event.amount, polygonUSDTContractDecimals)
    )

    let tx
    // find related tx
    if (blockchainTx.transactionId) {
      tx = await this.paymentService.baseFindById(blockchainTx.transactionId)
    } else {
      tx = await this.atomService.findFirst({
        table: 'transaction',
        where: {
          provider: PAYMENT_PROVIDER.blockchain,
          providerTxId: blockchainTx.id,
        },
      })
      if (tx) {
        // this blockchainTx data is broken, fix it
        await this.atomService.update({
          table: 'blockchain_transaction',
          where: { id: blockchainTx.id },
          data: {
            transactionId: tx.id,
          },
        })
        if (tx.state === TRANSACTION_STATE.succeeded) {
          return
        }
      }
    }

    if (tx) {
      // this blackchain tx record, related tx record, validate it
      if (
        tx.senderId === curatorUser.id &&
        tx.recipientId === creatorUser.id &&
        tx.targetId === article.id &&
        toTokenBaseUnit(tx.amount, polygonUSDTContractDecimals) === event.amount
      ) {
        // related tx record is valid, update its state
        await this.succeedBothTxAndBlockchainTx(tx.id, blockchainTx.id)
      } else {
        // related tx record is invalid, correct it and update state
        await this.atomService.update({
          table: 'transaction',
          where: { id: tx.id },
          data: {
            amount,
            senderId: curatorUser.id,
            recipientId: creatorUser.id,
            targetId: article.id,
            currency: PAYMENT_CURRENCY.USDT,
            provider: PAYMENT_PROVIDER.blockchain,
            providerTxId: blockchainTx.id,
          },
        })
        await this.succeedBothTxAndBlockchainTx(tx.id, blockchainTx.id)
      }
    } else {
      // no related tx record, create one
      const trx = await this.knex.transaction()
      try {
        tx = await this.paymentService.createTransaction(
          {
            amount,
            state: TRANSACTION_STATE.succeeded,
            purpose: TRANSACTION_PURPOSE.donation,
            currency: PAYMENT_CURRENCY.USDT,
            provider: PAYMENT_PROVIDER.blockchain,
            providerTxId: blockchainTx.id,
            recipientId: creatorUser.id,
            senderId: curatorUser.id,
            targetId: article.id,
          },
          trx
        )
        await this.paymentService.baseUpdate(
          blockchainTx.id,
          { transactionId: tx.id },
          'blockchain_transaction',
          trx
        )
        await trx.commit()
      } catch (error) {
        await trx.rollback()
        throw error
      }
    }
    if (
      curatorUser.userName &&
      creatorUser.userName &&
      curatorUser.email &&
      creatorUser.email
    ) {
      await this.paymentService.notifyDonation({
        tx,
        sender: curatorUser as EmailableUser,
        recipient: creatorUser as EmailableUser,
        article,
      })
    }
    await this.invalidCache(tx.targetType, tx.targetId)
  }

  private fetchCurationLogs = async (
    curation: CurationContract,
    savepoint: number
  ): Promise<[Array<Log<CurationEvent>>, number]> => {
    const safeBlockNum =
      (await curation.fetchBlockNumber()) - BLOCKCHAIN_SAFE_CONFIRMS.Polygon

    const fromBlockNum = savepoint + 1

    if (fromBlockNum >= safeBlockNum) {
      return [[], savepoint as number]
    }
    return [await curation.fetchLogs(fromBlockNum, safeBlockNum), safeBlockNum]
  }

  private syncCurationEvents = async (logs: Array<Log<CurationEvent>>) => {
    const events = []
    for (const log of logs) {
      if (log.removed) {
        // getlogs from final blocks should not return removed logs
        throw new UnknownError('unexpected removed logs')
      }
      const data: any = { ...log.event }
      const blockchainTx =
        await this.paymentService.findOrCreateBlockchainTransaction(
          { chain: BLOCKCHAIN.Polygon, txHash: log.txHash },
          { state: BLOCKCHAIN_TRANSACTION_STATE.succeeded }
        )
      data.blockchainTransactionId = blockchainTx.id
      data.contractAddress = log.address
      await this.handleNewEvent(log, blockchainTx)

      events.push(data)
    }
    if (events.length >= 0) {
      await this.paymentService.baseBatchCreate(
        events,
        'blockchain_curation_event'
      )
    }
  }

  private updateTxAndBlockchainTxState = async (
    {
      txId,
      txState,
      txRemark,
    }: {
      txId: string
      txState: TRANSACTION_STATE
      txRemark?: TRANSACTION_REMARK
    },
    {
      blockchainTxId,
      blockchainTxState,
    }: {
      blockchainTxId: string
      blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE
    }
  ) => {
    const trx = await this.knex.transaction()
    try {
      await this.paymentService.markTransactionStateAs(
        {
          id: txId,
          state: txState,
          remark: txRemark,
        },
        trx
      )
      await this.paymentService.markBlockchainTransactionStateAs(
        {
          id: blockchainTxId,
          state: blockchainTxState,
        },
        trx
      )
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  private failBothTxAndBlockchainTx = async (
    txId: string,
    blockchainTxId: string
  ) => {
    await this.updateTxAndBlockchainTxState(
      { txId, txState: TRANSACTION_STATE.failed },
      {
        blockchainTxId,
        blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.reverted,
      }
    )
  }

  private succeedBothTxAndBlockchainTx = async (
    txId: string,
    blockchainTxId: string
  ) => {
    await this.updateTxAndBlockchainTxState(
      { txId, txState: TRANSACTION_STATE.succeeded },
      {
        blockchainTxId,
        blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
      }
    )
  }

  private containMatchedEvent = async (
    events: CurationEvent[],
    {
      curatorAddress,
      creatorAddress,
      cid,
      tokenAddress,
      amount,
      decimals,
    }: {
      curatorAddress?: string
      creatorAddress?: string
      cid: string
      tokenAddress: string
      amount: string
      decimals: number
    }
  ) => {
    if (events.length === 0) {
      return false
    }

    if (!curatorAddress || !creatorAddress) {
      return false
    }

    for (const event of events) {
      if (
        ignoreCaseMatch(event.curatorAddress, curatorAddress) &&
        ignoreCaseMatch(event.creatorAddress, creatorAddress) &&
        ignoreCaseMatch(event.tokenAddress || '', tokenAddress) &&
        event.amount === toTokenBaseUnit(amount, decimals) &&
        isValidUri(event.uri) &&
        extractCid(event.uri) === cid
      ) {
        return true
      }
    }

    return false
  }

  private invalidCache = async (targetType: string, targetId: string) => {
    // manaully invalidate cache
    if (targetType) {
      const entity = await this.userService.baseFindEntityTypeTable(targetType)
      const entityType =
        NODE_TYPES[
          (_capitalize(entity?.table) as keyof typeof NODE_TYPES) || ''
        ]
      if (entityType) {
        invalidateFQC({
          node: { type: entityType, id: targetId },
          redis,
        })
      }
    }
  }
}

const ignoreCaseMatch = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase()

const isValidUri = (uri: string): boolean => /^ipfs:\/\//.test(uri)

const extractCid = (uri: string): string => uri.replace('ipfs://', '')

export const payToByBlockchainQueue = new PayToByBlockchainQueue()
