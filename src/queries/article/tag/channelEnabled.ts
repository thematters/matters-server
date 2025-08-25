import type { GQLTagResolvers } from '#definitions/index.js'

const resolver: GQLTagResolvers['channelEnabled'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const channel = await atomService.findFirst({
    table: 'tag_channel',
    where: { tagId: id },
  })
  return channel?.enabled ?? false
}

export default resolver
