import type { Connections } from '#definitions/index.js'

import {
  NODE_TYPES,
  CURATION_CHANNEL_STATE,
  CURATION_CHANNEL_COLOR,
} from '#common/enums/index.js'
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

describe('channels query', () => {
  const QUERY_CHANNELS = /* GraphQL */ `
    query Channels($input: ChannelsInput) {
      channels(input: $input) {
        id
        ... on TopicChannel {
          name
        }
        ... on CurationChannel {
          name
          color
          pinAmount
        }
        ... on WritingChallenge {
          name
        }
      }
    }
  `

  beforeEach(async () => {
    // Clean up existing channels
    await atomService.deleteMany({ table: 'topic_channel' })
    await atomService.deleteMany({ table: 'curation_channel' })
    await atomService.deleteMany({ table: 'campaign_channel' })
  })

  test('returns all channels for admin with oss flag', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create test channels
    const topicChannel = await channelService.updateOrCreateChannel({
      name: 'test-topic',
      providerId: '1',
      enabled: false,
    })

    const curationChannel = await channelService.createCurationChannel({
      name: 'test-curation',
      state: CURATION_CHANNEL_STATE.editing,
      color: CURATION_CHANNEL_COLOR.red,
    })

    const campaign = await campaignService.createWritingChallenge({
      name: 'test-campaign',
      creatorId: '1',
    })
    await channelService.updateOrCreateCampaignChannel({
      campaignId: campaign.id,
      enabled: false,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNELS,
      variables: { input: { oss: true } },
    })

    expect(errors).toBeUndefined()
    expect(data.channels).toHaveLength(3)

    // Verify topic channel
    const returnedTopicChannel = data.channels.find(
      (c: any) =>
        c.id ===
        toGlobalId({ type: NODE_TYPES.TopicChannel, id: topicChannel.id })
    )
    expect(returnedTopicChannel).toBeDefined()
    expect(returnedTopicChannel.name).toBe('test-topic')

    // Verify curation channel
    const returnedCurationChannel = data.channels.find(
      (c: any) =>
        c.id ===
        toGlobalId({ type: NODE_TYPES.CurationChannel, id: curationChannel.id })
    )
    expect(returnedCurationChannel).toBeDefined()
    expect(returnedCurationChannel.name).toBe('test-curation')
    expect(returnedCurationChannel.color).toBe(CURATION_CHANNEL_COLOR.red)

    // Verify campaign channel
    const returnedCampaign = data.channels.find(
      (c: any) =>
        c.id === toGlobalId({ type: NODE_TYPES.Campaign, id: campaign.id })
    )
    expect(returnedCampaign).toBeDefined()
    expect(returnedCampaign.name).toBe('test-campaign')
  })

  test('returns only enabled channels for normal user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create enabled and disabled channels
    const enabledTopicChannel = await channelService.updateOrCreateChannel({
      name: 'enabled-topic',
      enabled: true,
      providerId: '1',
    })
    await channelService.updateOrCreateChannel({
      name: 'disabled-topic',
      enabled: false,
      providerId: '2',
    })

    const activeDate = new Date()
    const activePeriod = [
      new Date(activeDate.getTime() - 86400000),
      new Date(activeDate.getTime() + 86400000),
    ] as const

    const publishedCurationChannel = await channelService.createCurationChannel(
      {
        name: 'published-curation',
        state: CURATION_CHANNEL_STATE.published,
        activePeriod,
      }
    )
    await channelService.createCurationChannel({
      name: 'editing-curation',
      state: CURATION_CHANNEL_STATE.editing,
      activePeriod,
    })

    const enabledCampaign = await campaignService.createWritingChallenge({
      name: 'enabled-campaign',
      creatorId: '1',
    })
    await channelService.updateOrCreateCampaignChannel({
      campaignId: enabledCampaign.id,
      enabled: true,
    })

    const disabledCampaign = await campaignService.createWritingChallenge({
      name: 'disabled-campaign',
      creatorId: '1',
    })
    await channelService.updateOrCreateCampaignChannel({
      campaignId: disabledCampaign.id,
      enabled: false,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNELS,
    })

    expect(errors).toBeUndefined()
    expect(data.channels).toHaveLength(3)

    // Should only return enabled topic channel
    const returnedTopicChannel = data.channels.find(
      (c: any) =>
        c.id ===
        toGlobalId({
          type: NODE_TYPES.TopicChannel,
          id: enabledTopicChannel.id,
        })
    )
    expect(returnedTopicChannel).toBeDefined()

    // Should only return published curation channel
    const returnedCurationChannel = data.channels.find(
      (c: any) =>
        c.id ===
        toGlobalId({
          type: NODE_TYPES.CurationChannel,
          id: publishedCurationChannel.id,
        })
    )
    expect(returnedCurationChannel).toBeDefined()

    // Should only return enabled campaign
    const returnedCampaign = data.channels.find(
      (c: any) =>
        c.id ===
        toGlobalId({ type: NODE_TYPES.Campaign, id: enabledCampaign.id })
    )
    expect(returnedCampaign).toBeDefined()
  })

  test('returns channels in correct order', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create channels with different orders
    const topicChannel = await channelService.updateOrCreateChannel({
      name: 'topic',
      enabled: true,
      providerId: '1',
    })
    await channelService.updateChannelOrder(
      { type: NODE_TYPES.TopicChannel, id: topicChannel.id },
      2
    )

    const activeDate = new Date()
    const activePeriod = [
      new Date(activeDate.getTime() - 86400000),
      new Date(activeDate.getTime() + 86400000),
    ] as const

    const curationChannel = await channelService.createCurationChannel({
      name: 'curation',
      state: CURATION_CHANNEL_STATE.published,
      activePeriod,
    })
    await channelService.updateChannelOrder(
      { type: NODE_TYPES.CurationChannel, id: curationChannel.id },
      1
    )

    const campaign = await campaignService.createWritingChallenge({
      name: 'campaign',
      creatorId: '1',
    })
    await channelService.updateOrCreateCampaignChannel({
      campaignId: campaign.id,
      enabled: true,
    })
    await channelService.updateChannelOrder(
      { type: NODE_TYPES.Campaign, id: campaign.id },
      0
    )

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNELS,
    })

    expect(errors).toBeUndefined()
    expect(data.channels).toHaveLength(3)

    // Verify order
    expect(data.channels[0].id).toBe(
      toGlobalId({ type: NODE_TYPES.Campaign, id: campaign.id })
    )
    expect(data.channels[1].id).toBe(
      toGlobalId({ type: NODE_TYPES.CurationChannel, id: curationChannel.id })
    )
    expect(data.channels[2].id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: topicChannel.id })
    )
  })

  test('returns empty array when no channels exist', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNELS,
    })

    expect(errors).toBeUndefined()
    expect(data.channels).toHaveLength(0)
  })
})
