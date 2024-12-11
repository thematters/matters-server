import type {
  Connections,
  ValueOf,
  CampaignStage,
  Campaign,
  User,
  Article,
} from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import {
  CAMPAIGN_TYPE,
  CAMPAIGN_STATE,
  CAMPAIGN_USER_STATE,
  NODE_TYPES,
  USER_STATE,
  OFFICIAL_NOTICE_EXTEND_TYPE,
  ARTICLE_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  ForbiddenByTargetStateError,
  ForbiddenByStateError,
  ForbiddenError,
  CampaignNotFoundError,
  CampaignStageNotFoundError,
  ActionFailedError,
  UserInputError,
} from 'common/errors'
import {
  shortHash,
  toDatetimeRangeString,
  fromDatetimeRangeString,
  fromGlobalId,
  // excludeSpam,
} from 'common/utils'
import { AtomService, NotificationService } from 'connectors'

interface Stage {
  name: string
  description?: string
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
    coverId,
    link,
    applicationPeriod,
    writingPeriod,
    state,
    creatorId,
  }: {
    name: string
    coverId?: string
    link?: string
    applicationPeriod?: readonly [Date, Date]
    writingPeriod?: readonly [Date, Date]
    state?: ValueOf<typeof CAMPAIGN_STATE>
    creatorId: string
  }) =>
    this.models.create({
      table: 'campaign',
      data: {
        shortHash: shortHash(),
        type: CAMPAIGN_TYPE.writingChallenge,
        name,
        link,
        cover: coverId,
        applicationPeriod: applicationPeriod
          ? toDatetimeRangeString(applicationPeriod[0], applicationPeriod[1])
          : null,
        writingPeriod: writingPeriod
          ? toDatetimeRangeString(writingPeriod[0], writingPeriod[1])
          : null,
        state: state || CAMPAIGN_STATE.pending,
        creatorId,
      },
    })

  public updateStages = async (campaignId: string, stages: Stage[]) => {
    await this.models.deleteMany({
      table: 'campaign_stage',
      where: { campaignId },
    })

    if (stages.length > 0) {
      const knex = this.connections.knex
      return knex<CampaignStage>('campaign_stage')
        .insert(
          stages.map(({ name, description, period }) => ({
            campaignId,
            name,
            description: description || '',
            period: period ? toDatetimeRangeString(period[0], period[1]) : null,
          }))
        )
        .returning('*')
    }
    return []
  }

  public updateAnnouncements = async (
    campaignId: string,
    articleIds: string[]
  ) => {
    const original = await this.models.findMany({
      table: 'campaign_article',
      where: { campaignId, announcement: true },
      orderBy: [{ column: 'id', order: 'asc' }],
    })
    const originalIds = original.map(({ articleId }) => articleId)

    // delete removed
    await this.models.deleteMany({
      table: 'campaign_article',
      where: { campaignId },
      whereIn: [
        'articleId',
        originalIds.filter((id) => !articleIds.includes(id)),
      ],
    })

    // insert new
    for (const newId of articleIds.filter((id) => !originalIds.includes(id))) {
      await this.models.create({
        table: 'campaign_article',
        data: { campaignId, articleId: newId, announcement: true },
      })
    }
  }

  public findAnnouncements = async (campaignId: string) => {
    const records = await this.models.findMany({
      table: 'campaign_article',
      where: { campaignId, announcement: true },
    })
    const articles = await this.models.articleIdLoader.loadMany(
      records.map(({ articleId }) => articleId)
    )
    return articles.filter((article) => article.state === ARTICLE_STATE.active)
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

    let application = await this.models.findFirst({
      table: 'campaign_user',
      where: { campaignId: campaign.id, userId: user.id },
    })
    if (application) {
      return application
    }
    application = await this.models.create({
      table: 'campaign_user',
      data: {
        campaignId: campaign.id,
        userId: user.id,
        state: CAMPAIGN_USER_STATE.pending,
      },
    })

    return await this.approve(application.id)
  }

  public getApplication = async (campaignId: string, userId: string) =>
    this.models.findFirst({
      table: 'campaign_user',
      where: { userId, campaignId },
    })

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
      .select('campaign.*', knexRO.raw('count(1) OVER() AS total_count'))
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
    { take, skip }: { take?: number; skip: number },
    {
      filterStates,
    }: {
      filterStates?: Array<ValueOf<typeof CAMPAIGN_USER_STATE>>
    } = {
      filterStates: [CAMPAIGN_USER_STATE.succeeded],
    }
  ): Promise<[User[], number]> => {
    const knexRO = this.connections.knexRO
    const records = await knexRO('campaign_user')
      .select('*', knexRO.raw('count(1) OVER() AS total_count'))
      .where({ campaignId })
      .orderBy('id', 'desc')
      .offset(skip)
      .modify((builder) => {
        if (filterStates) {
          builder.whereIn('state', filterStates)
        }
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

  public findArticles = (
    campaignId: string,
    {
      filterStageId,
      featured,
      spamThreshold,
    }: {
      filterStageId?: string
      featured?: boolean
      spamThreshold?: null | number
    } = {}
  ) => {
    const knexRO = this.connections.knexRO
    const query = knexRO('campaign_article')
      .select('article.*', knexRO.raw('campaign_article.id AS order'))
      .join('article', 'article.id', 'campaign_article.article_id')
      .where({ campaignId, state: ARTICLE_STATE.active })
    // .modify(excludeSpam, spamThreshold)

    if (filterStageId) {
      query.where({ campaignStageId: filterStageId })
    }

    if (featured) {
      query.where({ featured })
    }

    return query
  }

  public updateArticleCampaigns = async (
    article: Pick<Article, 'id' | 'authorId'>,
    newCampaigns: Array<{ campaignId: string; campaignStageId?: string }>
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
            data: { campaignStageId: campaignStageId ?? null },
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
    campaignStageId?: string
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
    campaignStageId?: string
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

    if (!campaignStageId) {
      return
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

  public approve = async (applicationId: string) => {
    const application = await this.models.findUnique({
      table: 'campaign_user',
      where: { id: applicationId },
    })
    if (application.state === CAMPAIGN_USER_STATE.rejected) {
      throw new ActionFailedError('can not approve rejected application')
    }
    if (application.state === CAMPAIGN_USER_STATE.succeeded) {
      return application
    }
    const updated = await this.models.update({
      table: 'campaign_user',
      where: { id: applicationId },
      data: { state: CAMPAIGN_USER_STATE.succeeded },
    })

    const notificationService = new NotificationService(this.connections)

    const campaign = await this.models.findUnique({
      table: 'campaign',
      where: { id: updated.campaignId },
    })
    const end =
      fromDatetimeRangeString(campaign.applicationPeriod as string)[1] ??
      new Date()

    notificationService.trigger({
      event:
        application.createdAt.getTime() < end.getTime()
          ? OFFICIAL_NOTICE_EXTEND_TYPE.write_challenge_applied
          : OFFICIAL_NOTICE_EXTEND_TYPE.write_challenge_applied_late_bird,
      entities: [{ type: 'target', entityTable: 'campaign', entity: campaign }],
      recipientId: updated.userId,
      data: {
        link:
          campaign.link || `${environment.siteDomain}/e/${campaign.shortHash}`,
      },
    })

    invalidateFQC({
      node: { type: NODE_TYPES.Campaign, id: updated.id },
      redis: this.connections.redis,
    })
    invalidateFQC({
      node: { type: NODE_TYPES.User, id: updated.userId },
      redis: this.connections.redis,
    })
    return updated
  }

  public findGrandSlamUsers = async (
    campaignId: string,
    stageIds?: string[]
  ) => {
    const knexRO = this.connections.knexRO
    const campaignStagesId = (
      await knexRO('campaign_stage').where({ campaignId }).select('id')
    ).map(({ id }) => id)

    if (
      stageIds &&
      stageIds.length > 0 &&
      !stageIds.every((id) => campaignStagesId.includes(id))
    ) {
      throw new UserInputError('stage not found in campaign')
    }
    const _stageIds = stageIds || campaignStagesId

    // find user, stage pairs that have submitted articles to needed stages in right period
    const base = knexRO('campaign_article')
      .select('article.author_id', 'campaign_stage_id')
      .join('article', 'article.id', 'campaign_article.article_id')
      .join(
        'campaign_stage',
        'campaign_stage.id',
        'campaign_article.campaign_stage_id'
      )
      .join('campaign_user', 'campaign_user.user_id', 'article.author_id')
      .join('user', 'user.id', 'article.author_id')
      .join('campaign', 'campaign.id', 'campaign_article.campaign_id')
      .where({
        'campaign_article.campaign_id': campaignId,
        'campaign_user.state': CAMPAIGN_USER_STATE.succeeded,
        'user.state': USER_STATE.active,
      })
      .whereIn('campaign_stage.id', _stageIds)
      .where(
        'campaign.writing_period',
        '@>',
        knexRO.ref('campaign_article.created_at')
      )
      .where(
        'campaign.application_period',
        '@>',
        knexRO.ref('campaign_user.created_at')
      )
      .groupBy('article.author_id', 'campaign_stage_id')
      .having(knexRO.raw('count(1)'), '>', 0)

    // find users that have submitted articles to all needed stages
    const grandSlamUserIdsQuery = knexRO(base.as('t'))
      .select('author_id')
      .groupBy('author_id')
      .having(knexRO.raw('count(1)'), '=', _stageIds.length)

    // console.log(grandSlamUserIdsQuery.toString())

    const grandSlamUserIds = (await grandSlamUserIdsQuery).map(
      ({ authorId }) => authorId
    )
    return this.models.userIdLoader.loadMany(grandSlamUserIds)
  }

  public setBoost = async ({ id, boost }: { id: string; boost: number }) =>
    this.models.upsert({
      table: 'campaign_boost',
      create: { campaignId: id, boost },
      update: { campaignId: id, boost },
      where: { campaignId: id },
    })

  public validateCampaigns = async (
    campaigns: Array<{ campaign: string; stage?: string }>,
    userId: string
  ) => {
    const _campaigns = campaigns.map(
      ({ campaign: campaignGlobalId, stage: stageGlobalId }) => {
        const { id: campaignId, type: campaignIdType } =
          fromGlobalId(campaignGlobalId)
        if (campaignIdType !== NODE_TYPES.Campaign) {
          throw new UserInputError('invalid campaign id')
        }

        if (!stageGlobalId) {
          return { campaign: campaignId }
        }

        const { id: stageId, type: stageIdType } = fromGlobalId(stageGlobalId)
        if (stageIdType !== NODE_TYPES.CampaignStage) {
          throw new UserInputError('invalid stage id')
        }

        return { campaign: campaignId, stage: stageId }
      }
    )

    for (const { campaign, stage } of _campaigns) {
      await this.validate({
        userId,
        campaignId: campaign,
        campaignStageId: stage,
      })
    }
    return _campaigns
  }
}
