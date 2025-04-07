import type { Connections } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { genConnections, closeConnections, testClient } from '../../utils.js'
import {
  ChannelService,
  AtomService,
  CampaignService,
} from '#connectors/index.js'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService
let campaignService: CampaignService

beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
  campaignService = new CampaignService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('reorderChannels', () => {
  const REORDER_CHANNELS = /* GraphQL */ `
    mutation ReorderChannels($input: ReorderChannelsInput!) {
      reorderChannels(input: $input)
    }
  `

  test('reorders channels successfully', async () => {
    // Create test channels
    const topicChannel = await channelService.createTopicChannel({
      name: 'test-topic',
      providerId: '1',
      enabled: true,
    })

    const curationChannel = await channelService.createCurationChannel({
      name: 'test-curation',
    })

    const campaign = await campaignService.createWritingChallenge({
      name: 'test-campaign',
      creatorId: '1',
    })
    const campaignChannel = await channelService.updateOrCreateCampaignChannel({
      campaignId: campaign.id,
      enabled: true,
    })

    // Prepare global IDs
    const ids = [
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: topicChannel.id }),
      toGlobalId({ type: NODE_TYPES.CurationChannel, id: curationChannel.id }),
      toGlobalId({ type: NODE_TYPES.Campaign, id: campaignChannel.campaignId }),
    ]

    // Execute mutation
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })
    const { data, errors } = await server.executeOperation({
      query: REORDER_CHANNELS,
      variables: { input: { ids } },
    })

    expect(errors).toBeUndefined()
    expect(data?.reorderChannels).toBe(true)

    // Verify order was updated
    const updatedTopicChannel = await atomService.findFirst({
      table: 'topic_channel',
      where: { id: topicChannel.id },
    })
    expect(updatedTopicChannel.order).toBe(0)

    const updatedCurationChannel = await atomService.findFirst({
      table: 'curation_channel',
      where: { id: curationChannel.id },
    })
    expect(updatedCurationChannel.order).toBe(1)

    const updatedCampaignChannel = await atomService.findFirst({
      table: 'campaign_channel',
      where: { campaignId: campaign.id },
    })
    expect(updatedCampaignChannel.order).toBe(2)
  })

  test('throws error for unauthorized user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: false,
    })
    const { errors } = await server.executeOperation({
      query: REORDER_CHANNELS,
      variables: { input: { ids: [] } },
    })

    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test('throws error for invalid channel type', async () => {
    const invalidId = toGlobalId({ type: NODE_TYPES.User, id: '1' })

    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })
    const { errors } = await server.executeOperation({
      query: REORDER_CHANNELS,
      variables: { input: { ids: [invalidId] } },
    })

    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })
})
