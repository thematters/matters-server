import type {
  Connections,
  Campaign,
  CampaignStage,
  Article,
  User,
} from '#definitions/index.js'

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

describe('remove campaign articles', () => {
  const REMOVE_CAMPAIGN_ARTICLES = /* GraphQL */ `
    mutation ($input: RemoveCampaignArticlesInput!) {
      removeCampaignArticles(input: $input) {
        id
        ... on WritingChallenge {
          articles(input: { first: null }) {
            totalCount
          }
        }
      }
    }
  `

  let campaign: Campaign
  let stages: CampaignStage[]
  let articles: Article[]
  let campaignGlobalId: string
  let articleGlobalId: string
  let normalUser: User
  let participant: User

  beforeEach(async () => {
    // Setup campaign and article
    campaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    stages = await campaignService.updateStages(campaign.id, [
      { name: 'stage1' },
    ])

    participant = await atomService.findUnique({
      table: 'user',
      where: { id: '1' },
    })
    await campaignService.apply(campaign, participant)

    articles = await atomService.findMany({
      table: 'article',
      where: { authorId: participant.id },
    })
    await campaignService.submitArticleToCampaign(
      articles[0],
      campaign.id,
      stages[0].id
    )

    campaignGlobalId = toGlobalId({
      type: NODE_TYPES.Campaign,
      id: campaign.id,
    })
    articleGlobalId = toGlobalId({
      type: NODE_TYPES.Article,
      id: articles[0].id,
    })

    normalUser = await atomService.findFirst({
      table: 'user',
      where: { role: 'user' },
    })
  })

  test('should remove article successfully', async () => {
    const adminServer = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data: updatedData, errors: updatedErrors } =
      await adminServer.executeOperation({
        query: REMOVE_CAMPAIGN_ARTICLES,
        variables: {
          input: {
            campaign: campaignGlobalId,
            articles: [articleGlobalId],
          },
        },
      })
    expect(updatedErrors).toBeUndefined()
    expect(updatedData.removeCampaignArticles.articles.totalCount).toBe(0)
  })

  test('should reject unauthorized user', async () => {
    const unauthorizedServer = await testClient({
      connections,
    })

    const { errors: unauthorizedErrors } =
      await unauthorizedServer.executeOperation({
        query: REMOVE_CAMPAIGN_ARTICLES,
        variables: {
          input: {
            campaign: campaignGlobalId,
            articles: [articleGlobalId],
          },
        },
      })
    expect(unauthorizedErrors[0].extensions.code).toBe('UNAUTHENTICATED')
  })

  test('should reject normal user', async () => {
    const normalUserServer = await testClient({
      connections,
      isAuth: true,
      context: { viewer: normalUser },
    })

    const { errors: normalUserErrors } =
      await normalUserServer.executeOperation({
        query: REMOVE_CAMPAIGN_ARTICLES,
        variables: {
          input: {
            campaign: campaignGlobalId,
            articles: [articleGlobalId],
          },
        },
      })
    expect(normalUserErrors[0].extensions.code).toBe('FORBIDDEN')
  })

  test('should allow campaign admin to remove articles', async () => {
    // Create campaign with admin user
    const campaignManager = await atomService.findUnique({
      table: 'user',
      where: { id: '3' },
    })
    const campaignWithManagers = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
      managerIds: [campaignManager.id],
    })
    await campaignService.apply(campaignWithManagers, normalUser)
    await campaignService.submitArticleToCampaign(
      articles[0],
      campaignWithManagers.id,
      stages[0].id
    )

    const campaignWithManagersGlobalId = toGlobalId({
      type: NODE_TYPES.Campaign,
      id: campaignWithManagers.id,
    })

    const campaignManagerServer = await testClient({
      connections,
      isAuth: true,
      context: { viewer: campaignManager },
    })

    const { errors: campaignManagerErrors } =
      await campaignManagerServer.executeOperation({
        query: REMOVE_CAMPAIGN_ARTICLES,
        variables: {
          input: {
            campaign: campaignWithManagersGlobalId,
            articles: [articleGlobalId],
          },
        },
      })
    expect(campaignManagerErrors).toBeUndefined()
  })

  test('should allow system admin to remove articles', async () => {
    const adminServer = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors: adminErrors } = await adminServer.executeOperation({
      query: REMOVE_CAMPAIGN_ARTICLES,
      variables: {
        input: {
          campaign: campaignGlobalId,
          articles: [articleGlobalId],
        },
      },
    })
    expect(adminErrors).toBeUndefined()
  })

  test('should reject invalid campaign ID', async () => {
    const adminServer = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const invalidCampaignId = toGlobalId({
      type: NODE_TYPES.Campaign,
      id: '99999',
    })

    const { errors: invalidCampaignErrors } =
      await adminServer.executeOperation({
        query: REMOVE_CAMPAIGN_ARTICLES,
        variables: {
          input: {
            campaign: invalidCampaignId,
            articles: [articleGlobalId],
          },
        },
      })
    expect(invalidCampaignErrors[0].extensions.code).toBe('CAMPAIGN_NOT_FOUND')
  })

  test('should reject invalid article ID', async () => {
    const adminServer = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const invalidArticleId = toGlobalId({
      type: NODE_TYPES.Article,
      id: '99999',
    })

    const { errors: invalidArticleErrors } = await adminServer.executeOperation(
      {
        query: REMOVE_CAMPAIGN_ARTICLES,
        variables: {
          input: {
            campaign: campaignGlobalId,
            articles: [invalidArticleId],
          },
        },
      }
    )
    expect(invalidArticleErrors[0].extensions.code).toBe('BAD_USER_INPUT')
  })
})
