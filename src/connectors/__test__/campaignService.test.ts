import type { Connections } from 'definitions'

import { CAMPAIGN_STATE } from 'common/enums'
import { getDatetimeRangeString } from 'common/utils'
import { CampaignService, AtomService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let campaignService: CampaignService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  campaignService = new CampaignService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('create writing_challenge campaign', () => {
  test('success', async () => {
    const campaign = await campaignService.createWritingChallenge({
      name: 'test',
      description: 'test',
      link: 'https://test.com',
      applicationPeriod: [
        new Date('2010-01-01 11:30'),
        new Date('2010-01-01 15:00'),
      ],
      writingPeriod: [
        new Date('2010-01-02 11:30'),
        new Date('2010-01-02 15:00'),
      ],
      creatorId: '1',
    })
    expect(campaign).toBeDefined()
    expect(campaign.state).toBe(CAMPAIGN_STATE.pending)

    // add stages

    const stages1 = [{ name: 'stage1' }, { name: 'stage2' }]
    await campaignService.updateStages(campaign.id, stages1)
    const stages1Result = await atomService.findMany({
      table: 'campaign_stage',
      where: { campaignId: campaign.id },
    })
    expect(stages1Result.map((s) => s.name)).toEqual(stages1.map((s) => s.name))
    expect(stages1Result.map((s) => s.period)).toEqual([null, null])

    // update stages

    const stages2 = [
      {
        name: 'stage1',
        period: [
          new Date('2010-01-03 11:30'),
          new Date('2010-01-03 15:00'),
        ] as const,
      },
      {
        name: 'stage3',
        period: [
          new Date('2010-01-03 11:30'),
          new Date('2010-01-03 15:00'),
        ] as const,
      },
    ]
    await campaignService.updateStages(campaign.id, stages2)
    const stages2Result = await atomService.findMany({
      table: 'campaign_stage',
      where: { campaignId: campaign.id },
    })
    expect(stages2Result.map((s) => s.name)).toEqual(stages2.map((s) => s.name))
    expect(stages2Result[0].period).not.toBeNull()
  })
})
