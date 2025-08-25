import type { Connections } from '#definitions/index.js'

import {
  NODE_TYPES,
  CURATION_CHANNEL_STATE,
  CAMPAIGN_STATE,
} from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { genConnections, closeConnections, testClient } from '../../utils.js'
import {
  ChannelService,
  CampaignService,
  TagService,
} from '#connectors/index.js'

let connections: Connections
let channelService: ChannelService
let campaignService: CampaignService
let tagService: TagService

beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  campaignService = new CampaignService(connections)
  tagService = new TagService(connections)
}, 50000)

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

  test('returns topic channel for any user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create test channel
    const channel = await channelService.createTopicChannel({
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

  test('returns enabled topic channel for any user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create test channel
    const channel = await channelService.createTopicChannel({
      name: 'test-topic-enabled',
      providerId: '2',
      enabled: true,
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
    expect(data.channel.name).toBe('test-topic-enabled')
    expect(data.channel.enabled).toBe(true)
  })

  test('returns curation channel for any user', async () => {
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
    expect(data.channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.CurationChannel, id: channel.id })
    )
    expect(data.channel.shortHash).toBe(channel.shortHash)
    expect(data.channel.name).toBe('test-curation')
    expect(data.channel.channelState).toBe(CURATION_CHANNEL_STATE.editing)
  })

  test('returns published curation channel for any user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create test channel
    const channel = await channelService.createCurationChannel({
      name: 'test-curation-published',
      state: CURATION_CHANNEL_STATE.published,
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
    expect(data.channel.name).toBe('test-curation-published')
    expect(data.channel.channelState).toBe(CURATION_CHANNEL_STATE.published)
  })

  test('returns campaign for any user', async () => {
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
    expect(data.channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.Campaign, id: campaign.id })
    )
    expect(data.channel.shortHash).toBe(campaign.shortHash)
    expect(data.channel.name).toBe('test-campaign')
    expect(data.channel.campaignState).toBe(CAMPAIGN_STATE.pending)
  })

  test('returns active campaign for any user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create test campaign
    const campaign = await campaignService.createWritingChallenge({
      name: 'test-campaign-active',
      creatorId: '1',
      state: CAMPAIGN_STATE.active,
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
    expect(data.channel.name).toBe('test-campaign-active')
    expect(data.channel.campaignState).toBe(CAMPAIGN_STATE.active)
  })

  test('returns tag for any user', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })

    // Create tag with shortHash
    const tag = await tagService.create({
      content: 'tag-channel',
      creator: '1',
    })

    const QUERY_CHANNEL = /* GraphQL */ `
      query Channel($input: ChannelInput!) {
        channel(input: $input) {
          id
          shortHash
          ... on Tag {
            content
          }
        }
      }
    `

    const { data, errors } = await server.executeOperation({
      query: QUERY_CHANNEL,
      variables: {
        input: { shortHash: tag.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.channel.id).toBe(
      toGlobalId({ type: NODE_TYPES.Tag, id: tag.id })
    )
    expect(data.channel.shortHash).toBe(tag.shortHash)
    expect(data.channel.content).toBe('tag-channel')
  })

  test('returns null for non-existent channel', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
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

  test('works for unauthenticated users', async () => {
    const server = await testClient({
      connections,
      isAuth: false,
    })

    // Create test channel
    const channel = await channelService.createTopicChannel({
      name: 'test-topic-unauthenticated',
      providerId: '3',
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
    expect(data.channel.name).toBe('test-topic-unauthenticated')
    expect(data.channel.enabled).toBe(false)
  })
})
