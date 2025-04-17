import type {
  Connections,
  User,
  Campaign,
  CampaignStage,
  Article,
} from '#definitions/index.js'

import {
  CAMPAIGN_STATE,
  USER_STATE,
  CAMPAIGN_USER_STATE,
  ARTICLE_STATE,
} from '#common/enums/index.js'
import { ForbiddenError } from '#common/errors.js'
import { CampaignService, AtomService } from '#connectors/index.js'

import { genConnections, closeConnections } from './utils.js'

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

describe('create writing_challenge campaign', () => {
  test('success', async () => {
    const campaign = await campaignService.createWritingChallenge(campaignData)
    expect(campaign).toBeDefined()
    expect(campaign.state).toBe(CAMPAIGN_STATE.pending)

    // zero announcements
    const noAnnouncements = await campaignService.findAnnouncements(campaign.id)
    expect(noAnnouncements.length).toBe(0)

    // add announcements
    await campaignService.updateAnnouncements(campaign.id, ['1', '2'])
    const announcements1 = await campaignService.findAnnouncements(campaign.id)
    expect(announcements1.length).toBe(2)

    // add more announcements
    await campaignService.updateAnnouncements(campaign.id, ['1', '2', '3'])
    const announcements2 = await campaignService.findAnnouncements(campaign.id)
    expect(announcements2.length).toBe(3)

    // archived articles are excluded
    const archivedArticleId = '4'
    await atomService.update({
      table: 'article',
      where: { id: archivedArticleId },
      data: { state: USER_STATE.archived },
    })
    await campaignService.updateAnnouncements(campaign.id, [
      '1',
      '2',
      '3',
      archivedArticleId,
    ])
    const announcements3 = await campaignService.findAnnouncements(campaign.id)
    expect(announcements3.length).toBe(3)

    // add stages

    const stageDescription = 'stage description'
    const stages1 = [
      { name: 'stage1' },
      { name: 'stage2', description: stageDescription },
    ]
    const stages1Result = await campaignService.updateStages(
      campaign.id,
      stages1
    )
    expect(stages1Result.map((s) => s.name)).toEqual(stages1.map((s) => s.name))
    expect(stages1Result.map((s) => s.description)).toEqual([
      '',
      stageDescription,
    ])
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
    const stages2Result = await campaignService.updateStages(
      campaign.id,
      stages2
    )
    expect(stages2Result.map((s) => s.name)).toEqual(stages2.map((s) => s.name))
    expect(stages2Result[0].period).not.toBeNull()

    // reset stages
    const stages3Result = await campaignService.updateStages(campaign.id, [])
    expect(stages3Result.length).toBe(0)
  })
})

describe('find and count campaigns', () => {
  let pendingCampaign: Campaign
  let activeCampaign: Campaign
  let finishedCampaign: Campaign
  let archivedCampaign: Campaign
  beforeAll(async () => {
    pendingCampaign = await campaignService.createWritingChallenge({
      ...campaignData,
      link: 'https://test.com',
      state: CAMPAIGN_STATE.pending,
    })
    expect(pendingCampaign.link).toBe('https://test.com')
    activeCampaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    finishedCampaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.finished,
    })
    archivedCampaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.archived,
    })
  })
  test('find with filterStates', async () => {
    const [campaigns1, totalCount1] = await campaignService.findAndCountAll(
      { take: 10, skip: 0 },
      { filterStates: undefined }
    )
    const campaignIds1 = campaigns1.map((c) => c.id)
    expect(campaigns1.length).toBeGreaterThan(0)
    expect(totalCount1).toBeGreaterThan(0)
    expect(campaignIds1).toContain(pendingCampaign.id)
    expect(campaignIds1).toContain(activeCampaign.id)
    expect(campaignIds1).toContain(finishedCampaign.id)
    expect(campaignIds1).toContain(archivedCampaign.id)

    const [campaigns2, totalCount2] = await campaignService.findAndCountAll({
      take: 10,
      skip: 0,
    })
    const campaignIds2 = campaigns2.map((c) => c.id)

    expect(campaigns2.length).toBeLessThan(campaigns1.length)
    expect(totalCount2).toBeLessThan(totalCount1)
    expect(campaignIds2).not.toContain(archivedCampaign.id)
    expect(campaignIds2).not.toContain(pendingCampaign.id)
  })
  test('find with filterUserId', async () => {
    const user = await atomService.findFirst({
      table: 'user',
      where: { state: USER_STATE.active },
    })
    const [campaigns, totalCount] = await campaignService.findAndCountAll(
      { take: 10, skip: 0 },
      { filterUserId: user.id }
    )
    expect(campaigns.length).toBe(0)
    expect(totalCount).toBe(0)

    // applied but pending
    await campaignService.apply(activeCampaign, user)
    const [campaigns2, totalCount2] = await campaignService.findAndCountAll(
      { take: 10, skip: 0 },
      { filterUserId: user.id }
    )
    expect(campaigns2.length).toBe(1)
    expect(totalCount2).toBe(1)
  })
})
describe('find and count articles', () => {
  let campaign: Campaign
  let stages: CampaignStage[]
  let articles: Article[]
  beforeAll(async () => {
    const user = await atomService.findUnique({
      table: 'user',
      where: { id: '1' },
    })
    articles = await atomService.findMany({
      table: 'article',
      where: { authorId: user.id },
    })
    campaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    stages = await campaignService.updateStages(campaign.id, [
      { name: 'stage1' },
      { name: 'stage2' },
    ])
    await campaignService.apply(campaign, user)
    await campaignService.submitArticleToCampaign(
      articles[0],
      campaign.id,
      stages[0].id
    )
    await campaignService.submitArticleToCampaign(
      articles[1],
      campaign.id,
      stages[1].id
    )
  })
  test('find all', async () => {
    const _articles = await campaignService.findArticles(campaign.id)
    expect(_articles.length).toBe(2)
  })
  test('find with filterStageId', async () => {
    const _articles = await campaignService.findArticles(campaign.id, {
      filterStageId: stages[0].id,
    })
    expect(_articles.length).toBe(1)
    expect(_articles[0].id).toBe(articles[0].id)
  })
  test('inactive articles are excluded', async () => {
    const _articles1 = await campaignService.findArticles(campaign.id)
    await atomService.update({
      table: 'article',
      where: { id: articles[0].id },
      data: { state: ARTICLE_STATE.archived },
    })
    const _articles2 = await campaignService.findArticles(campaign.id)
    expect(_articles2.length).toBe(_articles1.length - 1)
    await atomService.update({
      table: 'article',
      where: { id: articles[0].id },
      data: { state: ARTICLE_STATE.active },
    })
  })
  // test('spam are excluded', async () => {
  //   const spamThreshold = 0.5
  //   const _articles1 = await campaignService.findArticles(campaign.id)

  //   await atomService.update({
  //     table: 'article',
  //     where: { id: articles[0].id },
  //     data: { spamScore: spamThreshold + 0.1 },
  //   })

  //   const _articles2 = await campaignService.findArticles(campaign.id, {
  //     spamThreshold,
  //   })
  //   expect(_articles2.length).toBe(_articles1.length - 1)
  // })
})

describe('application', () => {
  test('apply successfully', async () => {
    const user = await atomService.findFirst({
      table: 'user',
      where: { state: USER_STATE.active },
    })
    const campaign = await campaignService.createWritingChallenge({
      state: CAMPAIGN_STATE.active,
      ...campaignData,
    })
    const application = await campaignService.apply(campaign, user)
    expect(application).toBeDefined()
    expect(application.state).toBe(CAMPAIGN_USER_STATE.succeeded)

    const [, totalCount1] = await campaignService.findAndCountParticipants(
      application.campaignId,
      { take: 10, skip: 0 }
    )
    expect(totalCount1).toBe(1)

    const [, totalCount2] = await campaignService.findAndCountParticipants(
      application.campaignId,
      { take: 10, skip: 0 },
      { filterStates: undefined }
    )
    expect(totalCount2).toBe(1)
  })
  test('campaign applicationPeriod is checked', async () => {
    const now = new Date()
    const future1 = new Date(now.getTime() + 1000 * 60 * 60 * 24)
    const future2 = new Date(now.getTime() + 1000 * 60 * 60 * 48)
    const campaign = await campaignService.createWritingChallenge({
      state: CAMPAIGN_STATE.active,
      ...campaignData,
      applicationPeriod: [future1, future2] as const,
    })
    const user = await atomService.findFirst({
      table: 'user',
      where: { state: USER_STATE.active },
    })
    expect(campaignService.apply(campaign, user)).rejects.toThrowError(
      ForbiddenError
    )
  })
})

describe('article submission', () => {
  let user: User
  let article: Article
  let campaign: Campaign
  let stages: CampaignStage[]
  let campaignNotApplied: Campaign
  let stagesNotApplied: CampaignStage[]
  beforeAll(async () => {
    user = await atomService.findFirst({
      table: 'user',
      where: { state: USER_STATE.active },
    })
    article = await atomService.findFirst({
      table: 'article',
      where: { authorId: user.id },
    })
    campaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    stages = await campaignService.updateStages(campaign.id, [
      { name: 'stage1' },
      { name: 'stage2' },
    ])
    await campaignService.apply(campaign, user)

    campaignNotApplied = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    stagesNotApplied = await campaignService.updateStages(
      campaignNotApplied.id,
      [{ name: 'stage1' }, { name: 'stage2' }]
    )
  })
  test('application is checked', async () => {
    expect(
      campaignService.updateArticleCampaigns(article, [
        {
          campaignId: campaignNotApplied.id,
          campaignStageId: stagesNotApplied[0].id,
        },
      ])
    ).rejects.toThrowError()
  })
  test('submit successfully', async () => {
    await campaignService.updateArticleCampaigns(article, [
      { campaignId: campaign.id, campaignStageId: stages[0].id },
    ])
    const campaignArticle1 = await atomService.findFirst({
      table: 'campaign_article',
      where: { campaignId: campaign.id, articleId: article.id },
    })
    expect(campaignArticle1).toBeDefined()
    expect(campaignArticle1.deleted).toBe(false)

    // change stage
    await campaignService.updateArticleCampaigns(article, [
      { campaignId: campaign.id, campaignStageId: stages[1].id },
    ])
    const campaignArticle2 = await atomService.findFirst({
      table: 'campaign_article',
      where: { campaignId: campaign.id, articleId: article.id },
    })
    expect(campaignArticle2.campaignStageId).toBe(stages[1].id)
    expect(campaignArticle2.deleted).toBe(false)

    // detach
    await campaignService.updateArticleCampaigns(article, [])
    const campaignArticle3 = await atomService.findFirst({
      table: 'campaign_article',
      where: { campaignId: campaign.id, articleId: article.id },
    })
    expect(campaignArticle3.deleted).toBe(true)

    // resubmit
    await campaignService.updateArticleCampaigns(article, [
      { campaignId: campaign.id, campaignStageId: stages[0].id },
    ])
    const campaignArticle4 = await atomService.findFirst({
      table: 'campaign_article',
      where: { campaignId: campaign.id, articleId: article.id },
    })
    expect(campaignArticle4.deleted).toBe(false)
    expect(campaignArticle4.campaignStageId).toBe(stages[0].id)
  })
})

describe('find grand_slam users', () => {
  let campaign: Campaign
  let stages: CampaignStage[]
  beforeAll(async () => {
    campaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    stages = await campaignService.updateStages(campaign.id, [
      {
        name: 'stage1',
        period: [
          new Date('2010-01-01 00:01'),
          new Date('2010-01-02 00:01'),
        ] as const,
      },
      {
        name: 'stage2',
        period: [
          new Date('2010-01-02 00:01'),
          new Date('2010-01-03 00:01'),
        ] as const,
      },
      {
        name: 'stage3',
        period: [
          new Date('2010-01-03 00:01'),
          new Date('2010-01-04 00:01'),
        ] as const,
      },
      { name: 'after' },
    ])
  })
  test('zero articles', async () => {
    const users = await campaignService.findGrandSlamUsers(campaign.id, [
      stages[0].id,
      stages[1].id,
    ])
    expect(users.length).toBe(0)
  })
  test('only find users that have submitted articles to all needed stages', async () => {
    const user = await atomService.findUnique({
      table: 'user',
      where: { id: '1' },
    })

    const application = await campaignService.apply(campaign, user)

    const articles = await atomService.findMany({
      table: 'article',
      where: { authorId: user.id },
    })

    // wrong submission time
    const submission0 = await campaignService.submitArticleToCampaign(
      articles[0],
      campaign.id,
      stages[0].id
    )
    const submission1 = await campaignService.submitArticleToCampaign(
      articles[1],
      campaign.id,
      stages[1].id
    )
    const users1 = await campaignService.findGrandSlamUsers(campaign.id, [
      stages[0].id,
      stages[1].id,
    ])
    expect(users1.length).toBe(0)

    // not enough stages
    await atomService.update({
      table: 'campaign_article',
      where: { id: submission0.id },
      data: { createdAt: new Date('2010-01-02 00:02') },
    })
    const users2 = await campaignService.findGrandSlamUsers(campaign.id, [
      stages[0].id,
      stages[1].id,
    ])
    expect(users2.length).toBe(0)

    // all submission are within writing period
    await atomService.update({
      table: 'campaign_article',
      where: { id: submission1.id },
      data: { createdAt: new Date('2010-01-03 00:02') },
    })
    const users3 = await campaignService.findGrandSlamUsers(campaign.id, [
      stages[0].id,
      stages[1].id,
    ])
    expect(users3.length).toBe(0)
    // application time is within application period
    await atomService.update({
      table: 'campaign_user',
      where: { id: application.id },
      data: { createdAt: new Date('2010-01-01 12:00') },
    })
    const users4 = await campaignService.findGrandSlamUsers(campaign.id, [
      stages[0].id,
      stages[1].id,
    ])
    expect(users4.length).toBe(1)

    // not enough stages
    const users5 = await campaignService.findGrandSlamUsers(campaign.id, [
      stages[0].id,
      stages[1].id,
      stages[2].id,
    ])
    expect(users5.length).toBe(0)
  })
})
