import { compare } from 'bcrypt'
import { v4 } from 'uuid'

import {
  LOG_RECORD_TYPES,
  PAYMENT_CURRENCY,
  PAYMENT_MAXIMUM_AMOUNT,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  USER_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import { UserInputError } from 'common/errors'
import logger from 'common/logger'
import { numRound } from 'common/utils'
import {
  GQLRewardState,
  GQLRewardType,
  MutationToRewardResolver,
} from 'definitions'

const resolver: MutationToRewardResolver = async (
  _,
  { input: { type, recipientEmails } },
  {
    dataSources: {
      articleService,
      paymentService,
      userService,
      notificationService,
      systemService,
    },
  }
) => {
  if (type !== GQLRewardType.firstArticle) {
    throw new UserInputError('invalid reward type')
  }

  const rewardAmountFirstArticle = parseInt(
    environment.rewardAmountFirstArticle,
    10
  )
  if (rewardAmountFirstArticle <= 0) {
    throw new UserInputError('amount is incorrect')
  }

  const rewardLikerId = environment.rewardLikerId
  if (!rewardLikerId) {
    throw new UserInputError('sender liker id is invalid')
  }

  const rewardUserId = environment.rewardUserId
  const rewardUser = await userService.dataloader.load(rewardUserId)
  if (!rewardUser) {
    throw new UserInputError('sender is invalid')
  }

  if (!recipientEmails || recipientEmails.length <= 0) {
    throw new UserInputError('`recipientEmails` is invalid')
  }

  const recipients = await userService.findByEmails(recipientEmails)

  if (!recipients || recipients.length <= 0) {
    throw new UserInputError('`recipientEmails` has invalid emails')
  }

  const results: Array<{ recipient: any; state: GQLRewardState }> = []

  await Promise.all(
    recipients.map(async (recipient) => {
      try {
        // check user state
        if (
          recipient.state === USER_STATE.archived ||
          recipient.state === USER_STATE.frozen
        ) {
          results.push({ recipient, state: GQLRewardState.skipped })
          return
        }

        // check article
        const article = await articleService.findFirstArticleByAuthor(
          recipient.id
        )
        if (!article) {
          results.push({ recipient, state: GQLRewardState.skipped })
          return
        }

        // check db record
        const rewardFirstArticleLog = await systemService.findLogRecord({
          userId: recipient.id,
          type: LOG_RECORD_TYPES.RewardFirstArticle,
        })
        if (rewardFirstArticleLog) {
          results.push({ recipient, state: GQLRewardState.skipped })
          return
        }

        // TODO: call API to transfer LIKE

        // insert a succeeded transaction
        const transaction = await paymentService.createTransaction({
          amount: rewardAmountFirstArticle,
          fee: 0,
          state: TRANSACTION_STATE.succeeded,
          recipientId: recipient.id,
          senderId: rewardUserId,
          targetId: article.id,
          targetType: TRANSACTION_TARGET_TYPE.article,
          currency: PAYMENT_CURRENCY.LIKE,
          purpose: TRANSACTION_PURPOSE.donation,
          provider: PAYMENT_PROVIDER.likecoin,
          providerTxId: v4(),
        })

        // insert db record
        await systemService.logRecord({
          type: LOG_RECORD_TYPES.RewardFirstArticle,
          userId: recipient.id,
        })

        // send email to recipient
        notificationService.trigger({
          event: 'payment_received_donation',
          actorId: rewardUserId,
          recipientId: recipient.id,
          entities: [
            {
              type: 'target',
              entityTable: 'transaction',
              entity: transaction,
            },
          ],
        })

        notificationService.mail.sendPayment({
          to: recipient.email,
          recipient: {
            displayName: recipient.displayName,
            userName: recipient.userName,
          },
          type: 'receivedDonation',
          tx: {
            recipient,
            sender: {
              displayName: rewardUser.displayName,
              userName: rewardUser.userName,
            },
            amount: numRound(transaction.amount),
            currency: transaction.currency,
          },
        })

        results.push({ recipient, state: GQLRewardState.succeeded })
        return
      } catch (e) {
        logger.error(e)
        results.push({ recipient, state: GQLRewardState.failed })
      }
    })
  )

  return results
}

export default resolver
