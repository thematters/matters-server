import { environment } from '#common/environment.js'
import { ChannelClassifier } from '#connectors/channel/channelClassifier.js'
import { ChannelJobService } from '#connectors/channel/channelJobService.js'

import { connections } from '../connections.js'

// AWS EventBridge can configure the input event sent to Lambda,
// see https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html for info.
type SyncArticleChannelsEvent = {
  data: {
    action: 'sync-processing-jobs' | 'retry-error-jobs' | 'retry-recent-jobs'
    // retry-recent-jobs value is the recent days to retry
    value?: number
  }
}

const channelJobService = new ChannelJobService(connections)

export const handler = async (event: SyncArticleChannelsEvent) => {
  const action = event.data.action
  const classifier = new ChannelClassifier(
    environment.channelClassificationApiUrl
  )

  try {
    if (action === 'sync-processing-jobs') {
      await channelJobService.syncProcessingJobs(classifier)
    } else if (action === 'retry-error-jobs') {
      await channelJobService.retryErrorJobs(classifier)
    } else if (action === 'retry-recent-jobs') {
      await channelJobService.retryRecentJobs(classifier, event.data.value ?? 1)
    }
  } catch (error) {
    console.error('Error syncing article channels:', error)
    throw error
  }
}
