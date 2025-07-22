import type { GQLQueryResolvers } from '#definitions/index.js'

const resolver: GQLQueryResolvers['channel'] = async (
  _,
  { input: { shortHash } },
  { viewer, dataSources: { atomService } }
) => {
  const topicChannel = await atomService.findUnique({
    table: 'topic_channel',
    where: { shortHash },
  })

  if (topicChannel) {
    return { ...topicChannel, __type: 'TopicChannel' }
  }

  const curationChannel = await atomService.findUnique({
    table: 'curation_channel',
    where: { shortHash },
  })

  if (curationChannel) {
    return { ...curationChannel, __type: 'CurationChannel' }
  }

  const campaign = await atomService.findUnique({
    table: 'campaign',
    where: { shortHash },
  })

  if (campaign) {
    return { ...campaign, __type: 'WritingChallenge' }
  }

  return null
}

export default resolver
