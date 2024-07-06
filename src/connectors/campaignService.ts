import type { Connections, ValueOf, CampaignStage } from 'definitions'

import { CAMPAIGN_TYPE, CAMPAIGN_STATE } from 'common/enums'
import { shortHash, toDatetimeRangeString } from 'common/utils'
import { AtomService } from 'connectors'

interface Stage {
  name: string
  period?: readonly [Date, Date | undefined]
}

export class CampaignService {
  // private connections: Connections
  private models: AtomService

  public constructor(connections: Connections) {
    // this.connections = connections
    this.models = new AtomService(connections)
  }

  public createWritingChallenge = async ({
    name,
    description,
    link,
    coverId,
    applicationPeriod,
    writingPeriod,
    state,
    creatorId,
  }: {
    name: string
    description: string
    link: string
    coverId?: string
    applicationPeriod: [Date, Date]
    writingPeriod: [Date, Date]
    state?: ValueOf<typeof CAMPAIGN_STATE>
    creatorId: string
  }) =>
    this.models.create({
      table: 'campaign',
      data: {
        shortHash: shortHash(),
        type: CAMPAIGN_TYPE.writingChallenge,
        name,
        description,
        link,
        cover: coverId,
        applicationPeriod: toDatetimeRangeString(
          applicationPeriod[0],
          applicationPeriod[1]
        ),
        writingPeriod: toDatetimeRangeString(
          writingPeriod[0],
          writingPeriod[1]
        ),
        state: state || CAMPAIGN_STATE.pending,
        creatorId,
      },
    })

  public updateStages = async (campaignId: string, stages: Stage[]) => {
    const newStages = stages.map(({ name, period }) => ({
      name,
      period: period ? toDatetimeRangeString(period[0], period[1]) : null,
    }))
    const orignalStages = await this.models.findMany({
      table: 'campaign_stage',
      where: { campaignId: campaignId },
    })
    // find the stages that need to be deleted and delete them
    const stagesToDelete = orignalStages.filter(
      (stage) => !newStages.find((s) => s.name === stage.name)
    )
    await this.models.deleteMany({
      table: 'campaign_stage',
      whereIn: ['id', stagesToDelete.map((s) => s.id)],
    })
    // find the stages that need to be updated and update them
    const stagesToUpdate = newStages.filter((s) =>
      orignalStages.find((stage) => stage.name === s.name)
    )
    const updated = await Promise.all(
      stagesToUpdate.map((s) =>
        this.models.update({
          table: 'campaign_stage',
          where: { campaignId, name: s.name },
          data: s,
        })
      )
    )
    // find the stages that need to be created and create them
    const stagesToCreate = newStages.filter(
      (s) => !orignalStages.find((stage) => stage.name === s.name)
    )
    const added = await Promise.all(
      stagesToCreate.map((s) =>
        this.models.create({
          table: 'campaign_stage',
          data: { campaignId, ...s },
        })
      )
    )

    return stages.map(
      (s) =>
        updated.find((u) => u.name === s.name) ||
        added.find((a) => a.name === s.name)
    ) as CampaignStage[]
  }
}
