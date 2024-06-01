import type { AtomService } from 'connectors'
import type SlackService from 'connectors/slack'
import type { Cluster, Redis } from 'ioredis'

import { invalidateFQC } from '@matters/apollo-response-cache'
import _ from 'lodash'
import Stripe from 'stripe'

import { METADATA_KEY, NODE_TYPES } from 'common/enums'

export const updateAccount = async (
  {
    account,
    event,
  }: {
    account: Stripe.Account
    event: Stripe.Event
  },
  {
    atomService,
    slack,
    redis,
  }: {
    atomService: AtomService
    slack: SlackService
    redis: Redis | Cluster
  }
) => {
  const slackEventData = {
    id: event.id,
    type: event.type,
  }

  const metadata = account.metadata
  const userId = _.get(metadata, METADATA_KEY.USER_ID)

  if (!userId) {
    return
  }

  // check
  const payoutAccount = await atomService.findFirst({
    table: 'payout_account',
    where: { userId, accountId: account.id, archived: false },
  })
  if (!payoutAccount) {
    slack.sendStripeAlert({
      data: slackEventData,
      message: `[Connect] can't find valid payout account (${account.id}).`,
    })
    return
  }

  // update if `capabilities.transfers` state becomes `active`
  const prevCapabilitiesTransfers = payoutAccount.capabilitiesTransfers
  const newCapabilitiesTransfers = account.capabilities?.transfers === 'active'

  if (prevCapabilitiesTransfers === newCapabilitiesTransfers) {
    return
  }

  await atomService.update({
    table: 'payout_account',
    where: { id: payoutAccount.id },
    data: {
      capabilitiesTransfers: newCapabilitiesTransfers,
      updatedAt: new Date(),
    },
  })

  // invalidate user cache
  await invalidateFQC({
    node: { type: NODE_TYPES.User, id: userId },
    redis: redis as Redis,
  })
}
