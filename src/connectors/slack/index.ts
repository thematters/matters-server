import { WebClient } from '@slack/web-api'

import { SLACK_MESSAGE_STATE } from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { numRound } from 'common/utils'

class SlackService {
  client: WebClient

  constructor() {
    this.client = new WebClient(environment.slackToken)
  }

  getMessageColor = (state: SLACK_MESSAGE_STATE) => {
    switch (state) {
      case SLACK_MESSAGE_STATE.successful:
        return '#27ffc9'
      case SLACK_MESSAGE_STATE.failed:
        return '#ff275d'
      default:
        return '#ffc927'
    }
  }

  sendPayoutMessage = async ({
    amount,
    fee,
    state,
    txId,
    userName,
  }: {
    amount: number
    fee: number
    state: SLACK_MESSAGE_STATE
    txId: string
    userName: string
  }) => {
    try {
      await this.client.chat.postMessage({
        channel: environment.slackPayoutChannel,
        text: `[${environment.env}] - Payout request is ${state}.`,
        attachments: [
          {
            color: this.getMessageColor(state),
            text: '\n'
              + `\n- *Matters id:* ${userName}`
              + `\n- *Stripe tx id*: ${txId}`
              + `\n- *Amount*: ${numRound(amount)}`
              + `\n- *Fee*: ${numRound(fee)}`,
          },
        ],
        markdown: true
      })
    } catch (error) {
      logger.error(error)
    }
  }
}

export default SlackService
