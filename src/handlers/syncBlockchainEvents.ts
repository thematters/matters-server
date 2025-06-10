import type { GQLChain } from '#definitions/index.js'

import { BLOCKCHAIN, SLACK_MESSAGE_STATE } from '#common/enums/index.js'
import { PaymentService } from '#connectors/index.js'
import SlackService from '#connectors/slack/index.js'

import { connections } from '../connections.js'

const paymentService = new PaymentService(connections)
const slackService = new SlackService()

// AWS EventBridge can configure the input event sent to Lambda,
// see https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html for info.
type SyncBlockchainEventsEvent = {
  data: {
    chain: GQLChain
  }
}

export const handler = async (event: SyncBlockchainEventsEvent) => {
  const chain = event.data?.chain || BLOCKCHAIN.Optimism // Default to Optimism if not specified

  try {
    console.log(`Syncing curation events for chain: ${chain}`)
    const savepoints = await paymentService.handleSyncCurationEvents(chain)
    console.log(
      `Successfully synced curation events for chain ${chain}: ${savepoints.join(
        ', '
      )}`
    )
  } catch (error: any) {
    console.error(
      `Failed to sync curation events for chain ${chain}:`,
      error.message
    )
    await slackService.sendQueueMessage({
      data: { error },
      title: `sync-blockchain-events:${chain}`,
      message: `Failed to sync ${chain} curation events`,
      state: SLACK_MESSAGE_STATE.failed,
    })
    throw error
  }
}
