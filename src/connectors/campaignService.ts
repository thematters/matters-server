import type {
  Connections,
  ValueOf,
  CampaignStage,
  Campaign,
  User,
} from 'definitions'

import {
  CAMPAIGN_TYPE,
  CAMPAIGN_STATE,
  CAMPAIGN_USER_STATE,
} from 'common/enums'
import {
  ForbiddenByTargetStateError,
  ForbiddenByStateError,
  ForbiddenError,
} from 'common/errors'
import {
  shortHash,
  toDatetimeRangeString,
  fromDatetimeRangeString,
} from 'common/utils'
import { AtomService } from 'connectors'

interface Stage {
  name: string
  period?: readonly [Date, Date | undefined]
}

export class CampaignService {
  private connections: Connections
  private models: AtomService

  public constructor(connections: Connections) {
    this.connections = connections
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
    applicationPeriod: readonly [Date, Date]
    writingPeriod: readonly [Date, Date]
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
    await this.models.deleteMany({
      table: 'campaign_stage',
      where: { campaignId },
    })

    const knex = this.connections.knex
    return knex<CampaignStage>('campaign_stage')
      .insert(
        stages.map(({ name, period }) => ({
          campaignId,
          name,
          period: period ? toDatetimeRangeString(period[0], period[1]) : null,
        }))
      )
      .returning('*')
  }

  public findAndCountAll = async (
    { skip, take }: { skip: number; take: number },
    options = {
      excludeStates: [CAMPAIGN_STATE.archived, CAMPAIGN_STATE.pending],
    }
  ): Promise<[Campaign[], number]> => {
    const knexRO = this.connections.knexRO
    const records = await knexRO('campaign')
      .select('*', knexRO.raw('count(1) OVER() AS total_count'))
      .orderBy('id', 'desc')
      .modify((builder) => {
        if (options.excludeStates) {
          builder.whereNotIn('state', options.excludeStates)
        }
      })
      .limit(take)
      .offset(skip)
    return [records, records.length === 0 ? 0 : +records[0].totalCount]
  }

  public apply = async (
    campaign: Pick<Campaign, 'id' | 'state' | 'applicationPeriod'>,
    user: Pick<User, 'id' | 'userName' | 'state'>
  ) => {
    if (campaign.state !== CAMPAIGN_STATE.active) {
      throw new ForbiddenByTargetStateError('campaign is not active')
    }

    if (campaign.applicationPeriod) {
      const [start] = fromDatetimeRangeString(campaign.applicationPeriod)
      const now = new Date()
      if (now.getTime() < start.getTime()) {
        throw new ForbiddenError('application period has not started yet')
      }
    }

    if (user.state !== 'active') {
      throw new ForbiddenByStateError('user is not active')
    }
    if (!user.userName) {
      throw new ForbiddenError('user has no username')
    }

    const application = await this.models.findFirst({
      table: 'campaign_user',
      where: { campaignId: campaign.id, userId: user.id },
    })
    if (application) {
      return application
    }
    return this.models.create({
      table: 'campaign_user',
      data: { campaignId: campaign.id, userId: user.id, state: 'pending' },
    })
  }

  public findAndCountParticipants = async (
    campaignId: string,
    { take, skip }: { take?: number; skip: number }
  ): Promise<[User[], number]> => {
    const knexRO = this.connections.knexRO
    const records = await knexRO('campaign_user')
      .select('*', knexRO.raw('count(1) OVER() AS total_count'))
      .where({ campaignId, state: CAMPAIGN_USER_STATE.succeeded })
      .orderBy('id', 'desc')
      .offset(skip)
      .modify((builder) => {
        if (take) {
          builder.limit(take)
        }
      })
    return [
      await this.models.userIdLoader.loadMany(
        records.map(({ userId }: { userId: string }) => userId)
      ),
      records.length === 0 ? 0 : +records[0].totalCount,
    ]
  }
}
