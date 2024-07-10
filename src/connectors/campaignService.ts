import type {
  Connections,
  ValueOf,
  CampaignStage,
  Campaign,
  User,
  Article,
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
  CampaignNotFoundError,
  CampaignStageNotFoundError,
  ActionFailedError,
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

  public apply = async (
    campaign: Pick<Campaign, 'id' | 'state' | 'applicationPeriod'>,
    user: Pick<User, 'id' | 'userName' | 'state'>,
    state: ValueOf<typeof CAMPAIGN_USER_STATE> = CAMPAIGN_USER_STATE.pending
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
      data: { campaignId: campaign.id, userId: user.id, state },
    })
  }

  public findAndCountAll = async (
    { skip, take }: { skip: number; take: number },
    {
      filterStates,
      filterUserId,
    }: {
      filterStates?: Array<ValueOf<typeof CAMPAIGN_STATE>>
      filterUserId?: string
    } = {
      filterStates: [CAMPAIGN_STATE.active, CAMPAIGN_STATE.finished],
    }
  ): Promise<[Campaign[], number]> => {
    const knexRO = this.connections.knexRO
    const records = await knexRO('campaign')
      .select('*', knexRO.raw('count(1) OVER() AS total_count'))
      .modify((builder) => {
        if (filterUserId) {
          builder
            .join('campaign_user', 'campaign.id', 'campaign_user.campaign_id')
            .where({
              userId: filterUserId,
              'campaign_user.state': CAMPAIGN_USER_STATE.succeeded,
            })
            .orderBy('campaign_user.id', 'desc')
        } else {
          builder.orderBy('campaign.id', 'desc')
        }
        if (filterStates) {
          builder.whereIn('campaign.state', filterStates)
        }
      })
      .limit(take)
      .offset(skip)
    return [records, records.length === 0 ? 0 : +records[0].totalCount]
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

  public findAndCountArticles = async (
    campaignId: string,
    { take, skip }: { take: number; skip: number },
    { filterStageId }: { filterStageId?: string } = {}
  ): Promise<[Article[], number]> => {
    const knexRO = this.connections.knexRO
    const records = await knexRO('campaign_article')
      .select('*', knexRO.raw('count(1) OVER() AS total_count'))
      .where({ campaignId })
      .modify((builder) => {
        if (filterStageId) {
          builder.where({ campaignStageId: filterStageId })
        }
      })
      .orderBy('id', 'desc')
      .offset(skip)
      .limit(take)
    return [
      await this.models.articleIdLoader.loadMany(
        records.map(({ articleId }: { articleId: string }) => articleId)
      ),
      records.length === 0 ? 0 : +records[0].totalCount,
    ]
  }

  public updateArticleCampaigns = async (
    article: Pick<Article, 'id' | 'authorId'>,
    newCampaigns: Array<{ campaignId: string; campaignStageId: string }>
  ) => {
    const mutatedCampaignIds = []
    const knexRO = this.connections.knexRO
    const originalCampaigns = await knexRO('campaign_article')
      .select('campaign_id', 'campaign_stage_id')
      .join('campaign', 'campaign.id', 'campaign_article.campaign_id')
      .where({ articleId: article.id, state: CAMPAIGN_STATE.active })

    const originalCampaignIds = originalCampaigns.map(
      ({ campaignId }) => campaignId
    )

    // attach to new campaigns or update stage
    for (const { campaignId, campaignStageId } of newCampaigns) {
      if (originalCampaignIds.includes(campaignId)) {
        if (
          originalCampaigns.find(
            ({ campaignId: id, campaignStageId: stageId }) =>
              id === campaignId && stageId === campaignStageId
          )
        ) {
          // already submitted to the same stage
          continue
        } else {
          await this.models.update({
            table: 'campaign_article',
            where: { articleId: article.id, campaignId },
            data: { campaignStageId },
          })
          mutatedCampaignIds.push(campaignId)
        }
      } else {
        await this.submitArticleToCampaign(article, campaignId, campaignStageId)
        mutatedCampaignIds.push(campaignId)
      }
    }

    // detach from removed campaigns
    const newCampaignIds = newCampaigns.map(({ campaignId }) => campaignId)
    const toRemove = originalCampaignIds.filter(
      (campaignId) => !newCampaignIds.includes(campaignId)
    )
    await this.models.deleteMany({
      table: 'campaign_article',
      where: { articleId: article.id },
      whereIn: ['campaignId', toRemove],
    })
    mutatedCampaignIds.push(...toRemove)
    return mutatedCampaignIds
  }

  public submitArticleToCampaign = async (
    article: Pick<Article, 'id' | 'authorId'>,
    campaignId: string,
    campaignStageId: string
  ) => {
    await this.validate({
      userId: article.authorId,
      campaignId,
      campaignStageId,
    })
    return this.models.create({
      table: 'campaign_article',
      data: { articleId: article.id, campaignId, campaignStageId },
    })
  }

  public validate = async ({
    campaignId,
    campaignStageId,
    userId,
  }: {
    campaignId: string
    campaignStageId: string
    userId: string
  }) => {
    const campaign = await this.models.campaignIdLoader.load(campaignId)
    if (!campaign) {
      throw new CampaignNotFoundError('campaign not found')
    }
    if (campaign.state !== CAMPAIGN_STATE.active) {
      throw new ActionFailedError('campaign not active')
    }

    const application = await this.models.findFirst({
      table: 'campaign_user',
      where: { campaignId, userId },
    })

    if (!application || application.state !== CAMPAIGN_USER_STATE.succeeded) {
      throw new ActionFailedError(`user not applied to campaign ${campaignId}`)
    }

    const stage = await this.models.campaignStageIdLoader.load(campaignStageId)
    if (!stage) {
      throw new CampaignStageNotFoundError('stage not found')
    }
    const periodStart = stage.period
      ? fromDatetimeRangeString(stage.period)[0].getTime()
      : null
    const now = new Date().getTime()
    if (periodStart && periodStart > now) {
      throw new ActionFailedError('stage not started')
    }
  }
}
