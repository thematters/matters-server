import type {
  TOPIC_CHANNEL_FEEDBACK_TYPE,
  TOPIC_CHANNEL_FEEDBACK_STATE,
} from '#common/enums/feedback.js'
import type { ValueOf } from './generic.js'

export interface TopicChannelFeedback {
  id: string
  articleId: string
  userId: string
  channelIds: string
  type: ValueOf<typeof TOPIC_CHANNEL_FEEDBACK_TYPE>
  state: ValueOf<typeof TOPIC_CHANNEL_FEEDBACK_STATE>
  createdAt: Date
  updatedAt: Date
}
