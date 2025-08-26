import type {
  GQLQueryResolvers,
  TopicChannel,
  CurationChannel,
  CampaignChannel,
  TagChannel,
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
  let tagChannels: TagChannel[] = []

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
    // include all tag channels
    tagChannels = await atomService.findMany({ table: 'tag_channel' })
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
    tagChannels = await atomService.findMany({
      table: 'tag_channel',
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
    ...tagChannels.map(async (channel) => ({
      ...(await atomService.findFirst({
        table: 'tag',
        where: { id: channel.tagId },
      })),
      order: channel.order ?? 0,
      __type: 'Tag',
    })),
  ])

  const typePriority: Record<string, number> = {
    WritingChallenge: 0,
    Tag: 1,
    CurationChannel: 2,
    TopicChannel: 3,
  }
  return channels.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    const pa = typePriority[a.__type] ?? 99
    const pb = typePriority[b.__type] ?? 99
    return pa - pb
  })
}

export default resolver
