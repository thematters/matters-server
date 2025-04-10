import type { Connections } from '#definitions/index.js'

import { NODE_TYPES, CAMPAIGN_STATE } from '#common/enums/index.js'
import { CampaignService, AtomService } from '#connectors/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { genConnections, closeConnections, testClient } from '../../utils.js'

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
  applicationPeriod: [new Date('2024-01-01'), new Date('2024-01-02')] as const,
  writingPeriod: [new Date('2024-01-03'), new Date('2024-01-04')] as const,
  creatorId: '1',
}

describe('featured articles management', () => {
  const TOGGLE_FEATURED_ARTICLES = /* GraphQL */ `
    mutation ($input: ToggleWritingChallengeFeaturedArticlesInput!) {
      toggleWritingChallengeFeaturedArticles(input: $input) {
        id
        ... on WritingChallenge {
          articles(input: { first: null, filter: { featured: true } }) {
            totalCount
          }
        }
      }
    }
  `

  test('toggle featured articles', async () => {
    const campaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    const stages = await campaignService.updateStages(campaign.id, [
      { name: 'stage1' },
      { name: 'stage2' },
    ])

    const user = await atomService.findUnique({
      table: 'user',
      where: { id: '1' },
    })
    await campaignService.apply(campaign, user)

    const articles = await atomService.findMany({
      table: 'article',
      where: { authorId: user.id },
    })
    await campaignService.submitArticleToCampaign(
      articles[0],
      campaign.id,
      stages[0].id
    )

    // add featured articles
    const adminServer = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })
    const campaignGlobalId = toGlobalId({
      type: NODE_TYPES.Campaign,
      id: campaign.id,
    })
    const articleGlobalId = toGlobalId({
      type: NODE_TYPES.Article,
      id: articles[0].id,
    })
    const { data: updatedData, errors: updatedErrors } =
      await adminServer.executeOperation({
        query: TOGGLE_FEATURED_ARTICLES,
        variables: {
          input: {
            campaign: campaignGlobalId,
            articles: [articleGlobalId],
            enabled: true,
          },
        },
      })
    expect(updatedErrors).toBeUndefined()
    expect(
      updatedData.toggleWritingChallengeFeaturedArticles.articles.totalCount
    ).toBe(1)

    // remove featured articles
    const { data: updatedData2, errors: updatedErrors2 } =
      await adminServer.executeOperation({
        query: TOGGLE_FEATURED_ARTICLES,
        variables: {
          input: {
            campaign: campaignGlobalId,
            articles: [articleGlobalId],
            enabled: false,
          },
        },
      })
    expect(updatedErrors2).toBeUndefined()
    expect(
      updatedData2.toggleWritingChallengeFeaturedArticles.articles.totalCount
    ).toBe(0)
  })

  test('toggle featured articles authorization', async () => {
    // Setup campaign and article
    const normalUser = await atomService.findFirst({
      table: 'user',
      where: { role: 'user' },
    })
    const adminUser = await atomService.findFirst({
      table: 'user',
      where: { role: 'admin' },
    })

    const campaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    const stages = await campaignService.updateStages(campaign.id, [
      { name: 'stage1' },
    ])

    const participant = await atomService.findUnique({
      table: 'user',
      where: { id: '1' },
    })
    await campaignService.apply(campaign, participant)

    const articles = await atomService.findMany({
      table: 'article',
      where: { authorId: participant.id },
    })
    await campaignService.submitArticleToCampaign(
      articles[0],
      campaign.id,
      stages[0].id
    )

    const campaignGlobalId = toGlobalId({
      type: NODE_TYPES.Campaign,
      id: campaign.id,
    })
    const articleGlobalId = toGlobalId({
      type: NODE_TYPES.Article,
      id: articles[0].id,
    })

    // Test 1: Unauthorized user (no viewer)
    const unauthorizedServer = await testClient({
      connections,
    })
    const { errors: unauthorizedErrors } =
      await unauthorizedServer.executeOperation({
        query: TOGGLE_FEATURED_ARTICLES,
        variables: {
          input: {
            campaign: campaignGlobalId,
            articles: [articleGlobalId],
            enabled: true,
          },
        },
      })
    expect(unauthorizedErrors[0].extensions.code).toBe('UNAUTHENTICATED')

    // Test 2: Normal user (not admin or campaign admin)
    const normalUserServer = await testClient({
      connections,
      isAuth: true,
      context: { viewer: normalUser },
    })
    const { errors: normalUserErrors } =
      await normalUserServer.executeOperation({
        query: TOGGLE_FEATURED_ARTICLES,
        variables: {
          input: {
            campaign: campaignGlobalId,
            articles: [articleGlobalId],
            enabled: true,
          },
        },
      })
    expect(normalUserErrors[0].extensions.code).toBe('FORBIDDEN')

    // Test 3: Campaign admin user
    // First create campaign with admin user
    const campaignWithManagers = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
      managerIds: [normalUser.id], // Make normalUser a campaign admin
    })
    const campaignWithManagersGlobalId = toGlobalId({
      type: NODE_TYPES.Campaign,
      id: campaignWithManagers.id,
    })

    const campaignManagerServer = await testClient({
      connections,
      isAuth: true,
      context: { viewer: normalUser }, // normalUser is now a campaign admin
    })
    const { errors: campaignManagerErrors } =
      await campaignManagerServer.executeOperation({
        query: TOGGLE_FEATURED_ARTICLES,
        variables: {
          input: {
            campaign: campaignWithManagersGlobalId,
            articles: [articleGlobalId],
            enabled: true,
          },
        },
      })
    expect(campaignManagerErrors).toBeUndefined()

    // Test 4: System admin user
    const adminServer = await testClient({
      connections,
      isAuth: true,
      context: { viewer: adminUser },
    })
    const { errors: adminErrors } = await adminServer.executeOperation({
      query: TOGGLE_FEATURED_ARTICLES,
      variables: {
        input: {
          campaign: campaignGlobalId,
          articles: [articleGlobalId],
          enabled: true,
        },
      },
    })
    expect(adminErrors).toBeUndefined()

    // Test 5: Invalid campaign ID
    const invalidCampaignId = toGlobalId({
      type: NODE_TYPES.Campaign,
      id: '99999',
    })
    const { errors: invalidCampaignErrors } =
      await adminServer.executeOperation({
        query: TOGGLE_FEATURED_ARTICLES,
        variables: {
          input: {
            campaign: invalidCampaignId,
            articles: [articleGlobalId],
            enabled: true,
          },
        },
      })
    expect(invalidCampaignErrors[0].extensions.code).toBe('CAMPAIGN_NOT_FOUND')
  })
})
