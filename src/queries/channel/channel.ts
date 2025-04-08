import type { GQLQueryResolvers } from '#definitions/index.js'

import {
  USER_ROLE,
  CURATION_CHANNEL_STATE,
  CAMPAIGN_STATE,
} from '#common/enums/index.js'

const resolver: GQLQueryResolvers['channel'] = async (
  _,
  { input: { shortHash } },
  { viewer, dataSources: { atomService } }
) => {
  const isAdmin = viewer.role === USER_ROLE.admin

  const topicChannel = await atomService.findUnique({
    table: 'topic_channel',
    where: { shortHash },
  })

  if (topicChannel) {
    if (!isAdmin && !topicChannel.enabled) {
      return null
    }
    return { ...topicChannel, __type: 'TopicChannel' }
  }

  const curationChannel = await atomService.findUnique({
    table: 'curation_channel',
    where: { shortHash },
  })

  if (curationChannel) {
    if (
      !isAdmin &&
      curationChannel.state !== CURATION_CHANNEL_STATE.published
    ) {
      return null
    }
    return { ...curationChannel, __type: 'CurationChannel' }
  }

  const campaign = await atomService.findUnique({
    table: 'campaign',
    where: { shortHash },
  })

  if (campaign) {
    if (
      !isAdmin &&
      [
        CAMPAIGN_STATE.pending as string,
        CAMPAIGN_STATE.archived as string,
      ].includes(campaign.state)
    ) {
      return null
    }
    return { ...campaign, __type: 'WritingChallenge' }
  }

  return null
}

export default resolver
