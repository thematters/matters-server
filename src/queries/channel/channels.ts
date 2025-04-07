import type {
  GQLQueryResolvers,
  TopicChannel,
  CurationChannel,
  CampaignChannel,
} from '#definitions/index.js'

import { USER_ROLE } from '#common/enums/index.js'

const resolver: GQLQueryResolvers['channels'] = async (
  _,
  { input },
  { viewer, dataSources: { atomService, channelService } }
) => {
  const oss = input?.oss ?? false
  const isAdmin = viewer.role === USER_ROLE.admin
  let topicChannels: TopicChannel[] = []
  let curationChannels: CurationChannel[] = []
  let campaignChannels: CampaignChannel[] = []

  if (oss && isAdmin) {
    topicChannels = await atomService.findMany({
      table: 'topic_channel',
    })
    curationChannels = await atomService.findMany({
      table: 'curation_channel',
    })
    campaignChannels = await atomService.findMany({
      table: 'campaign_channel',
    })
  } else {
    topicChannels = await atomService.findMany({
      table: 'topic_channel',
      where: { enabled: true },
    })
    curationChannels = await channelService.findActiveCurationChannels()
    campaignChannels = await atomService.findMany({
      table: 'campaign_channel',
      where: { enabled: true },
    })
  }

  const channels = await Promise.all([
    ...topicChannels.map((channel) => ({
      ...channel,
      __type: 'TopicChannel',
    })),
    ...curationChannels.map((channel) => ({
      ...channel,
      __type: 'CurationChannel',
    })),
    ...campaignChannels.map(async (channel) => ({
      ...(await atomService.findFirst({
        table: 'campaign',
        where: { id: channel.campaignId },
      })),
      order: channel.order ?? 0,
      __type: 'WritingChallenge',
    })),
  ])

  return channels.sort((a, b) => a.order - b.order)
}

export default resolver
