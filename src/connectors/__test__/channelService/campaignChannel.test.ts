import type { Connections } from '#definitions/index.js'

import {
  ChannelService,
  AtomService,
  CampaignService,
} from '#connectors/index.js'
import { genConnections, closeConnections } from '../utils.js'

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

describe('updateOrCreateCampaignChannel', () => {
  beforeAll(async () => {
    // create campaigns
    const campaignData = {
      name: 'test',
      applicationPeriod: [
        new Date('2010-01-01 11:30'),
        new Date('2010-01-01 15:00'),
      ] as const,
      writingPeriod: [
        new Date('2010-01-01 11:30'),
        new Date('2010-01-05 15:00'),
      ] as const,
      creatorId: '1',
    }
    await campaignService.createWritingChallenge(campaignData)
    await campaignService.createWritingChallenge(campaignData)
    await campaignService.createWritingChallenge(campaignData)
  })

  beforeEach(async () => {
    // Clean up campaign_channel table before each test
    await atomService.deleteMany({ table: 'campaign_channel' })
  })

  test('creates new campaign channel when it does not exist', async () => {
    const campaignId = '1'
    const enabled = true

    const channel = await channelService.updateOrCreateCampaignChannel({
      campaignId,
      enabled,
    })

    expect(channel).toBeDefined()
    expect(channel.campaignId).toBe(campaignId)
    expect(channel.enabled).toBe(enabled)
  })

  test('updates existing campaign channel', async () => {
    const campaignId = '1'

    // First create a disabled channel
    const initialChannel = await channelService.updateOrCreateCampaignChannel({
      campaignId,
      enabled: false,
    })

    // Then update it to enabled
    const updatedChannel = await channelService.updateOrCreateCampaignChannel({
      campaignId,
      enabled: true,
    })

    expect(updatedChannel.id).toBe(initialChannel.id)
    expect(updatedChannel.campaignId).toBe(campaignId)
    expect(updatedChannel.enabled).toBe(true)
  })
})
