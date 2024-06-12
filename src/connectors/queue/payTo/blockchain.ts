import type {
  EmailableUser,
  Connections,
  BlockchainTransaction,
  GQLChain,
} from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'
import Queue from 'bull'
import _capitalize from 'lodash/capitalize'
import { formatUnits, parseUnits } from 'viem'

import {
  BLOCKCHAIN,
  BLOCKCHAIN_CHAINID,
  BLOCKCHAIN_CHAINNAME,
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
import { contract, isProd } from 'common/environment'
import { PaymentQueueJobDataError } from 'common/errors'
import {
  PaymentService,
  UserService,
  AtomService,
  ArticleService,
} from 'connectors'
import { CurationContract, CurationEvent, Log } from 'connectors/blockchain'
import SlackService from 'connectors/slack'

import { BaseQueue } from '../baseQueue'

interface PaymentParams {
  txId: string
}

export class PayToByBlockchainQueue extends BaseQueue {
  private slackService: InstanceType<typeof SlackService>
  private delay: number

  public constructor(connections: Connections, delay?: number) {
    super(QUEUE_NAME.payToByBlockchain, connections)
    this.slackService = new SlackService()
    this.addConsumers()
    this.delay = delay ?? 5000 // 5s
  }

  /**
   * Producers
   *
   */
  public payTo = ({ txId }: PaymentParams) =>
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

  public addRepeatJobs = async () => {
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
   * Pay-to handler, process USDT tx synchronously.
   *
   * 1. Mark tx as succeeded if tx is mined;
   * 2. Mark tx as failed if blockchain tx or tx is reverted;
   * 3. Skip to process if tx is not found or mined;
   */
  private handlePayTo: Queue.ProcessCallbackFunction<unknown> = async (job) => {
    const data = job.data as PaymentParams
    const { txId } = data

    const paymentService = new PaymentService(this.connections)
    const userService = new UserService(this.connections)
    const atomService = new AtomService(this.connections)

    // skip if tx is not found
    const tx = await paymentService.baseFindById(txId)
    if (!tx) {
      job.discard()
      throw new PaymentQueueJobDataError('pay-to pending tx not found')
    }
    if (tx.provider !== PAYMENT_PROVIDER.blockchain) {
      job.discard()
      throw new PaymentQueueJobDataError('wrong pay-to queue')
    }

    // skip if blockchain tx is not found
    const blockchainTx = await paymentService.findBlockchainTransactionById(
      tx.providerTxId
    )
    if (!blockchainTx) {
      job.discard()
      throw new PaymentQueueJobDataError('blockchain transaction not found')
    }

    const chain = BLOCKCHAIN_CHAINNAME[blockchainTx.chainId]
    const contractAddress = contract[chain].curationAddress
    const curation = new CurationContract(
      BLOCKCHAIN_CHAINID[chain],
      contractAddress
    )
    const txReceipt = await curation.fetchTxReceipt(blockchainTx.txHash)

    // update metadata blockchain tx
    if (txReceipt) {
      await atomService.update({
        table: 'blockchain_transaction',
        where: { id: blockchainTx.id },
        data: {
          from: txReceipt.from,
          to: txReceipt.to,
          blockNumber: txReceipt.blockNumber.toString(),
        },
      })
    } else {
      // skip if tx is not mined
      throw new PaymentQueueJobDataError('blockchain transaction not mined')
    }

    // fail both tx and blockchain tx if it's reverted
    if (txReceipt.reverted) {
      await this.updateTxAndBlockchainTxState({
        txId,
        txState: TRANSACTION_STATE.failed,
        blockchainTxId: blockchainTx.id,
        blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.reverted,
      })
      return data
    }

    const [recipient, sender, article] = await Promise.all([
      userService.baseFindById(tx.recipientId),
      userService.baseFindById(tx.senderId as string),
      atomService.findFirst({
        table: 'article',
        where: { id: tx.targetId },
      }),
    ])
    const articleVersions = await atomService.findMany({
      table: 'article_version',
      where: { articleId: article.id },
    })
    const articleCids = articleVersions.map((v) => v.dataHash)

    // cancel tx and success blockchain tx if it's invalid
    // Note: sender and recipient's ETH address may change after tx is created
    const isValidTx = await this.containMatchedEvent(txReceipt.events, {
      cids: articleCids,
      amount: tx.amount,
      // support USDT only for now
      tokenAddress: contract[chain].tokenAddress,
      decimals: contract[chain].tokenDecimals,
    })
    if (!isValidTx) {
      await this.updateTxAndBlockchainTxState({
        txId,
        txState: TRANSACTION_STATE.canceled,
        txRemark: TRANSACTION_REMARK.INVALID,
        blockchainTxId: blockchainTx.id,
        blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
      })
      return data
    }

    // anonymize tx if sender's ETH address is not matched
    const isSenderMatched = txReceipt.events
      .map((e) => e.curatorAddress)
      .every((address) => ignoreCaseMatch(address, sender?.ethAddress || ''))
    if (!isSenderMatched) {
      await atomService.update({
        table: 'transaction',
        where: { id: tx.id },
        data: { senderId: null },
      })
    }

    // success both tx and blockchain tx if it's valid
    await this.succeedBothTxAndBlockchainTx(txId, blockchainTx.id)

    // notify recipient and sender (if needed)
    await paymentService.notifyDonation({
      tx,
      sender: isSenderMatched ? (sender as EmailableUser) : undefined,
      recipient: recipient as EmailableUser,
      article,
    })

    await this.invalidCache(tx.targetType, tx.targetId, userService)
    job.progress(100)
    return data
  }

  /**
   * syncCurationEvents handler, process blockchain tx asynchronously.
   *
   * 1. Fetch and save curation events from blockchain;
   * 2. Upsert `blockchain_transaction` if needed;
   * 3. Upsert `transaction` if needed;
   */
  private handleSyncCurationEvents: Queue.ProcessCallbackFunction<unknown> =
    async (_) => {
      let syncedBlockNum: { [key: string]: number } = {}

      ;[BLOCKCHAIN.Polygon, BLOCKCHAIN.Optimism].forEach(async (chain) => {
        // FIXME: pause support for the Polygon testnet
        // @see {src/common/enums/payment.ts:L59}
        if (chain === BLOCKCHAIN.Polygon && !isProd) {
          return
        }

        try {
          const blockNum = await this._handleSyncCurationEvents(chain)
          syncedBlockNum = { ...syncedBlockNum, [chain]: blockNum }
        } catch (error) {
          this.slackService.sendQueueMessage({
            data: { error },
            title: `${QUEUE_NAME.payToByBlockchain}:${QUEUE_JOB.syncCurationEvents}`,
            message: `'Failed to sync ${chain} curation events`,
            state: SLACK_MESSAGE_STATE.failed,
          })
          throw error
        }
      })

      return syncedBlockNum
    }

  private _handleSyncCurationEvents = async (chain: GQLChain) => {
    const atomService = new AtomService(this.connections)
    const chainId = BLOCKCHAIN_CHAINID[chain]

    // fetch events
    const contractAddress = contract[chain].curationAddress
    const curation = new CurationContract(chainId, contractAddress)
    const record = await atomService.findFirst({
      table: 'blockchain_sync_record',
      where: { chainId, contractAddress },
    })
    const oldSavepoint = record
      ? BigInt(parseInt(record.blockNumber, 10))
      : BigInt(parseInt(contract[chain].curationBlockNum, 10) || 0)
    const [logs, newSavepoint] = await this.fetchCurationLogs(
      curation,
      oldSavepoint
    )

    // update tx state and save events
    await this._syncCurationEvents(logs, chain)

    // save progress
    await atomService.upsert({
      table: 'blockchain_sync_record',
      where: { chainId, contractAddress },
      update: {
        chainId,
        contractAddress,
        blockNumber: newSavepoint.toString(),
      },
      create: {
        chainId,
        contractAddress,
        blockNumber: newSavepoint.toString(),
      },
    })

    return Number(newSavepoint)
  }

  private _handleNewEvent = async (
    event: CurationEvent,
    chain: GQLChain,
    blockchainTx: {
      id: string
      transactionId: string | null
      state: BLOCKCHAIN_TRANSACTION_STATE
    },
    services: {
      paymentService: PaymentService
      userService: UserService
      articleService: ArticleService
      atomService: AtomService
    }
  ) => {
    const { paymentService, userService, atomService } = services

    // related tx record has resolved
    if (
      blockchainTx.transactionId &&
      blockchainTx.state === BLOCKCHAIN_TRANSACTION_STATE.succeeded
    ) {
      return
    }

    // skip if token address or uri is invalid
    // support USDT only for now
    if (
      !ignoreCaseMatch(
        event.tokenAddress || '',
        contract[chain].tokenAddress
      ) ||
      !isValidUri(event.uri)
    ) {
      return
    }

    // skip if recipient or article is not found
    const creatorUser = await userService.findByEthAddress(event.creatorAddress)
    if (!creatorUser) {
      return
    }
    const cid = extractCid(event.uri)
    const articleVersion = await atomService.findFirst({
      table: 'article_version',
      where: { dataHash: cid },
    })
    const article = await atomService.findFirst({
      table: 'article',
      where: { id: articleVersion?.articleId, authorId: creatorUser.id },
    })
    if (!article) {
      return
    }

    const amount = parseFloat(
      formatUnits(BigInt(event.amount), contract[chain].tokenDecimals)
    )

    let tx
    if (blockchainTx.transactionId) {
      tx = await atomService.findFirst({
        table: 'transaction',
        where: { id: blockchainTx.transactionId },
      })
    } else {
      tx = await atomService.findFirst({
        table: 'transaction',
        where: {
          provider: PAYMENT_PROVIDER.blockchain,
          providerTxId: blockchainTx.id,
        },
      })
      // correct blockchainTx if its `transactionId` is invalid
      if (tx) {
        await atomService.update({
          table: 'blockchain_transaction',
          where: { id: blockchainTx.id },
          data: { transactionId: tx.id },
        })

        // skip if tx is already resolved
        if (tx.state === TRANSACTION_STATE.succeeded) {
          return
        }
      }
    }

    if (tx) {
      // correct invalid tx
      const isValidTx =
        tx.targetId === article.id &&
        parseUnits(tx.amount, contract[chain].tokenDecimals).toString() ===
          event.amount
      if (!isValidTx) {
        await atomService.update({
          table: 'transaction',
          where: { id: tx.id },
          data: {
            amount: amount.toString(),
            targetId: article.id,
            currency: PAYMENT_CURRENCY.USDT,
            provider: PAYMENT_PROVIDER.blockchain,
            providerTxId: blockchainTx.id,
          },
        })
      }

      // update tx state
      await this.succeedBothTxAndBlockchainTx(tx.id, blockchainTx.id)
    } else {
      // no related tx record (interacted with contract directly), create one
      const trx = await this.connections.knex.transaction()
      try {
        tx = await paymentService.createTransaction(
          {
            amount,
            state: TRANSACTION_STATE.succeeded,
            purpose: TRANSACTION_PURPOSE.donation,
            currency: PAYMENT_CURRENCY.USDT,
            provider: PAYMENT_PROVIDER.blockchain,
            providerTxId: blockchainTx.id,
            recipientId: creatorUser.id,
            senderId: undefined, // anonymize sender
            targetId: article.id,
          },
          trx
        )
        await paymentService.baseUpdate<BlockchainTransaction>(
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

    if (creatorUser.userName && creatorUser.email) {
      await paymentService.notifyDonation({
        tx,
        recipient: creatorUser as EmailableUser,
        article,
      })
    }
    await this.invalidCache(tx.targetType, tx.targetId, userService)
  }

  private fetchCurationLogs = async (
    curation: CurationContract,
    savepoint: bigint
  ): Promise<[Array<Log<CurationEvent>>, bigint]> => {
    const safeBlockNum =
      BigInt(await curation.fetchBlockNumber()) -
      BigInt(BLOCKCHAIN_SAFE_CONFIRMS[BLOCKCHAIN_CHAINNAME[curation.chainId]])

    const fromBlockNum = savepoint + BigInt(1)

    if (fromBlockNum >= safeBlockNum) {
      return [[], BigInt(savepoint)]
    }
    return [await curation.fetchLogs(fromBlockNum, safeBlockNum), safeBlockNum]
  }

  private _syncCurationEvents = async (
    logs: Array<Log<CurationEvent>>,
    chain: GQLChain
  ) => {
    const paymentService = new PaymentService(this.connections)
    const userService = new UserService(this.connections)
    const articleService = new ArticleService(this.connections)
    const atomService = new AtomService(this.connections)

    const chainId = BLOCKCHAIN_CHAINID[chain]
    const contractAddress = contract[chain].curationAddress
    const curation = new CurationContract(chainId, contractAddress)

    // save events to `blockchain_curation_event`
    const events: any[] = []
    for (const log of logs) {
      // skip if event is removed
      if (log.removed) {
        continue
      }

      const data: any = { ...log.event }
      const blockchainTx =
        await paymentService.findOrCreateBlockchainTransaction(
          { chainId, txHash: log.txHash },
          {
            state: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
            from: log.event.curatorAddress,
            to: curation.address,
            blockNumber: log.blockNumber,
          }
        )
      data.blockchainTransactionId = blockchainTx.id
      data.contractAddress = log.address

      // correct tx if needed
      try {
        await this._handleNewEvent(log.event, chain, blockchainTx, {
          paymentService,
          userService,
          articleService,
          atomService,
        })
      } catch (error) {
        this.slackService.sendQueueMessage({
          data: { error },
          title: `${QUEUE_NAME.payToByBlockchain}:${QUEUE_JOB.syncCurationEvents}`,
          message: `Failed to handle new event`,
          state: SLACK_MESSAGE_STATE.failed,
        })
      }

      events.push(data)
    }

    if (events.length >= 0) {
      await paymentService.baseBatchCreate(events, 'blockchain_curation_event')
    }
  }

  private updateTxAndBlockchainTxState = async ({
    txId,
    txState,
    txRemark,
    blockchainTxId,
    blockchainTxState,
  }: {
    txId: string
    txState: TRANSACTION_STATE
    txRemark?: TRANSACTION_REMARK
    blockchainTxId: string
    blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE
  }) => {
    const paymentService = new PaymentService(this.connections)
    const trx = await this.connections.knex.transaction()
    try {
      await paymentService.markTransactionStateAs(
        {
          id: txId,
          state: txState,
          remark: txRemark,
        },
        trx
      )
      await paymentService.markBlockchainTransactionStateAs(
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

  private succeedBothTxAndBlockchainTx = async (
    txId: string,
    blockchainTxId: string
  ) => {
    await this.updateTxAndBlockchainTxState({
      txId,
      txState: TRANSACTION_STATE.succeeded,
      blockchainTxId,
      blockchainTxState: BLOCKCHAIN_TRANSACTION_STATE.succeeded,
    })
  }

  private containMatchedEvent = async (
    events: CurationEvent[],
    {
      cids,
      tokenAddress,
      amount,
      decimals,
    }: {
      cids: string[]
      tokenAddress: string
      amount: string
      decimals: number
    }
  ) => {
    if (events.length === 0) {
      return false
    }

    for (const event of events) {
      if (
        ignoreCaseMatch(event.tokenAddress || '', tokenAddress) &&
        event.amount === parseUnits(amount, decimals).toString() &&
        isValidUri(event.uri) &&
        cids.includes(extractCid(event.uri))
      ) {
        return true
      }
    }

    return false
  }

  private invalidCache = async (
    targetType: string,
    targetId: string,
    userService: UserService
  ) => {
    // manually invalidate cache
    if (targetType) {
      const entity = await userService.baseFindEntityTypeTable(targetType)
      const entityType =
        NODE_TYPES[
          (_capitalize(entity?.table) as keyof typeof NODE_TYPES) || ''
        ]
      if (entityType) {
        invalidateFQC({
          node: { type: entityType, id: targetId },
          redis: this.connections.redis,
        })
      }
    }
  }
}

const ignoreCaseMatch = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase()

const isValidUri = (uri: string): boolean => /^ipfs:\/\//.test(uri)

const extractCid = (uri: string): string => uri.replace('ipfs://', '')
