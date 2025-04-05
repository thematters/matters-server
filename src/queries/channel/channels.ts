import type { GQLQueryResolvers, TopicChannel } from '#definitions/index.js'

import { USER_ROLE } from '#common/enums/index.js'

const resolver: GQLQueryResolvers['channels'] = async (
  _,
  __,
  { viewer, dataSources: { atomService } }
) => {
  const isAdmin = viewer.role === USER_ROLE.admin

  let channels: TopicChannel[] = []

  if (isAdmin) {
    channels = await atomService.findMany({
      table: 'topic_channel',
    })
  } else {
    channels = await atomService.findMany({
      table: 'topic_channel',
      where: { enabled: true },
    })
  }

  return channels.map((channel) => ({
    ...channel,
    __type: 'TopicChannel',
  }))
}

export default resolver
