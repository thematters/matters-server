import type { Connections } from '#definitions/index.js'

import {
  NODE_TYPES,
  CURATION_CHANNEL_STATE,
  CAMPAIGN_STATE,
} from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { genConnections, closeConnections, testClient } from '../../utils.js'
import { ChannelService, CampaignService } from '#connectors/index.js'

let connections: Connections
let channelService: ChannelService
let campaignService: CampaignService

beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  campaignService = new CampaignService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('channel query', () => {
  const QUERY_CHANNEL = /* GraphQL */ `
    query Channel($input: ChannelInput!) {
      channel(input: $input) {
        id
        shortHash
        ... on TopicChannel {
          name
          enabled
        }
        ... on CurationChannel {
          name
          channelState: state
        }
        ... on WritingChallenge {
          name
          campaignState: state
        }
      }
    }
  `

  test('returns topic channel for admin', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create test channel
    const channel = await channelService.updateOrCreateChannel({
      name: 'test-topic',
      providerId: '1',
      enabled: false,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNEL,
      variables: {
        input: { shortHash: channel.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.TopicChannel, id: channel.id })
    )
    expect(data.channel.shortHash).toBe(channel.shortHash)
    expect(data.channel.name).toBe('test-topic')
    expect(data.channel.enabled).toBe(false)
  })

  test('returns null for disabled topic channel for normal user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create test channel
    const channel = await channelService.updateOrCreateChannel({
      name: 'test-topic',
      providerId: '2',
      enabled: false,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNEL,
      variables: {
        input: { shortHash: channel.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel).toBeNull()
  })

  test('returns curation channel for admin', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create test channel
    const channel = await channelService.createCurationChannel({
      name: 'test-curation',
      state: CURATION_CHANNEL_STATE.editing,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNEL,
      variables: {
        input: { shortHash: channel.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.CurationChannel, id: channel.id })
    )
    expect(data.channel.shortHash).toBe(channel.shortHash)
    expect(data.channel.name).toBe('test-curation')
    expect(data.channel.channelState).toBe(CURATION_CHANNEL_STATE.editing)
  })

  test('returns null for non-published curation channel for normal user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create test channel
    const channel = await channelService.createCurationChannel({
      name: 'test-curation',
      state: CURATION_CHANNEL_STATE.editing,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNEL,
      variables: {
        input: { shortHash: channel.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel).toBeNull()
  })

  test('returns campaign for admin', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create test campaign
    const campaign = await campaignService.createWritingChallenge({
      name: 'test-campaign',
      creatorId: '1',
      state: CAMPAIGN_STATE.pending,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNEL,
      variables: {
        input: { shortHash: campaign.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.Campaign, id: campaign.id })
    )
    expect(data.channel.shortHash).toBe(campaign.shortHash)
    expect(data.channel.name).toBe('test-campaign')
    expect(data.channel.campaignState).toBe(CAMPAIGN_STATE.pending)
  })

  test('returns null for non-active campaign for normal user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create test campaign
    const campaign = await campaignService.createWritingChallenge({
      name: 'test-campaign',
      creatorId: '1',
      state: CAMPAIGN_STATE.pending,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNEL,
      variables: {
        input: { shortHash: campaign.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel).toBeNull()
  })

  test('returns null for non-existent channel', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNEL,
      variables: {
        input: { shortHash: 'non-existent' },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel).toBeNull()
  })
})
