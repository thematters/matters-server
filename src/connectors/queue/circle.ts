import { invalidateFQC } from '@matters/apollo-response-cache'
import Queue from 'bull'

import {
  HOUR,
  INVITATION_STATE,
  NODE_TYPES,
  PAYMENT_PROVIDER,
  PRICE_STATE,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
  SLACK_MESSAGE_STATE,
  SUBSCRIPTION_ITEM_REMARK,
  SUBSCRIPTION_STATE,
} from 'common/enums'
import logger from 'common/logger'
import { CacheService, PaymentService } from 'connectors'
import SlackService from 'connectors/slack'
import { Customer } from 'definitions'

import { BaseQueue } from './baseQueue'

class CircleQueue extends BaseQueue {
  paymentService: InstanceType<typeof PaymentService>
  slackService: InstanceType<typeof SlackService>

  constructor() {
    super(QUEUE_NAME.circle)
    this.paymentService = new PaymentService()
    this.slackService = new SlackService()
    this.cacheService = new CacheService()
    this.addConsumers()
  }

  /**
   * Producers
   */
  addRepeatJobs = async () => {
    // transfer trial end subscriptions every 12 hours
    this.q.add(
      QUEUE_JOB.transferTrialEndSubscriptions,
      {},
      {
        priority: QUEUE_PRIORITY.CRITICAL,
        repeat: { every: HOUR * 12 },
      }
    )
  }

  /**
   * Consumers
   */
  private addConsumers = () => {
    this.q.process(
      QUEUE_JOB.transferTrialEndSubscriptions,
      this.transferTrialEndSubscriptions
    )
  }

  private transferTrialEndSubscriptions: Queue.ProcessCallbackFunction<
    unknown
  > = async (job, done) => {
    try {
      logger.info('[schedule job] transfer trial end subscriptions')
      const knex = this.atomService.knex

      // obtain trial end subscription items from the past 7 days
      const trialEndSubItems = await knex
        .select(
          'csi.id',
          'csi.subscription_id',
          'csi.user_id',
          'csi.price_id',
          'circle_price.provider_price_id',
          'circle_price.circle_id',
          'expired_ivts.id as invitation_id'
        )
        .from(
          knex('circle_invitation')
            .select(
              '*',
              knex.raw(
                `accepted_at + duration_in_days * '1 day'::interval AS ended_at`
              )
            )
            .where({ state: INVITATION_STATE.accepted })
            .whereNotNull('subscription_item_id')
            .as('expired_ivts')
        )
        .leftJoin(
          'circle_subscription_item as csi',
          'csi.id',
          'expired_ivts.subscription_item_id'
        )
        .leftJoin('circle_price', 'circle_price.id', 'csi.price_id')
        .where({
          'csi.provider': PAYMENT_PROVIDER.matters,
          'csi.archived': false,
          'circle_price.state': PRICE_STATE.active,
        })
        .andWhere('ended_at', '>', knex.raw(`now() - interval '1 months'`))
        .andWhere('ended_at', '<=', knex.raw(`now()`))
      job.progress(30)

      const succeedItemIds = []
      const failedItemIds = []
      for (const item of trialEndSubItems) {
        try {
          // archive Matters subscription item
          await this.archiveMattersSubItem({
            subscriptionId: item.subscriptionId,
            subscriptionItemId: item.id,
          })

          // create Stripe subscription item
          await this.createStripeSubItem({
            userId: item.userId,
            subscriptionItemId: item.id,
            priceId: item.priceId,
            providerPriceId: item.providerPriceId,
          })

          // mark invitation as `transfer_succeeded`
          await this.markInvitationAs({
            invitationId: item.invitationId,
            state: INVITATION_STATE.transfer_succeeded,
          })
        } catch (error) {
          // mark invitation as `transfer_failed`
          await this.markInvitationAs({
            invitationId: item.invitationId,
            state: INVITATION_STATE.transfer_failed,
          })

          failedItemIds.push(item.id)
          logger.error(error)
        }

        // invalidate user & circle
        invalidateFQC({
          node: { type: NODE_TYPES.User, id: item.userId },
          redis: this.cacheService.redis,
        })
        invalidateFQC({
          node: { type: NODE_TYPES.Circle, id: item.circleId },
          redis: this.cacheService.redis,
        })

        succeedItemIds.push(item.id)
        logger.info(
          `[schedule job] Matters subscription item ${item.id} moved to Stripe.`
        )
      }

      job.progress(100)
      if (trialEndSubItems.length >= 1) {
        this.slackService.sendQueueMessage({
          data: { succeedItemIds, failedItemIds },
          title: `${QUEUE_NAME.circle}:transferTrialEndSubscriptions`,
          message: `Completed handling ${trialEndSubItems.length} trial ended subscription items.`,
          state: SLACK_MESSAGE_STATE.successful,
        })
      }
      done(null, { succeedItemIds, failedItemIds })
    } catch (error) {
      logger.error(error)
      this.slackService.sendQueueMessage({
        title: `${QUEUE_NAME.circle}:transferTrialEndSubscriptions`,
        message: `Failed to process cron job`,
        state: SLACK_MESSAGE_STATE.failed,
      })
      done(error)
    }
  }

  private archiveMattersSubItem = async ({
    subscriptionId,
    subscriptionItemId,
  }: {
    subscriptionId: string
    subscriptionItemId: string
  }) => {
    try {
      const subItems = await this.atomService.findMany({
        table: 'circle_subscription_item',
        where: { subscriptionId, archived: false },
      })

      // cancel the subscription if only one subscription item left
      if (subItems.length <= 1) {
        await this.atomService.update({
          table: 'circle_subscription',
          where: { id: subscriptionId },
          data: {
            state: SUBSCRIPTION_STATE.canceled,
            canceledAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }

      await this.atomService.update({
        table: 'circle_subscription_item',
        where: { id: subscriptionItemId },
        data: {
          archived: true,
          updatedAt: new Date(),
          remark: SUBSCRIPTION_ITEM_REMARK.trial_end,
        },
      })
    } catch (error) {
      this.slackService.sendQueueMessage({
        data: { subscriptionItemId },
        title: `${QUEUE_NAME.circle}:archiveMattersSubItem`,
        message: 'Failed to archive subscription item',
        state: SLACK_MESSAGE_STATE.failed,
      })
      throw error
    }
  }

  private createStripeSubItem = async ({
    userId,
    subscriptionItemId,
    priceId,
    providerPriceId,
  }: {
    userId: string
    subscriptionItemId: string
    priceId: string
    providerPriceId: string
  }) => {
    try {
      // retrieve user customer and subscriptions
      const customer = (await this.atomService.findFirst({
        table: 'customer',
        where: {
          userId,
          provider: PAYMENT_PROVIDER.stripe,
          archived: false,
        },
      })) as Customer
      const subscriptions = await this.paymentService.findActiveSubscriptions({
        userId,
      })

      if (!customer || !customer.cardLast4) {
        this.slackService.sendQueueMessage({
          data: { subscriptionItemId, customerId: customer?.id },
          title: `${QUEUE_NAME.circle}:createStripeSubItem`,
          message: 'Credit card is required on customer',
          state: SLACK_MESSAGE_STATE.failed,
        })
        return
      }

      await this.paymentService.createSubscriptionOrItem({
        userId,
        priceId,
        providerPriceId,
        providerCustomerId: customer.customerId,
        subscriptions,
      })
    } catch (error) {
      this.slackService.sendQueueMessage({
        data: { subscriptionItemId },
        title: `${QUEUE_NAME.circle}:createStripeSubItem`,
        message: 'Failed to create Stripe subscription item',
        state: SLACK_MESSAGE_STATE.failed,
      })
      throw error
    }
  }

  private markInvitationAs = async ({
    invitationId,
    state,
  }: {
    invitationId: string
    state: INVITATION_STATE
  }) => {
    await this.atomService.update({
      table: 'circle_invitation',
      where: { id: invitationId },
      data: { state },
    })
  }
}

export const circleQueue = new CircleQueue()
