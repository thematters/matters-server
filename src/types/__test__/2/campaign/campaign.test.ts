import type {
  Connections,
  User,
  Campaign,
  CampaignStage,
  Article,
} from '#definitions/index.js'

import { v4 } from 'uuid'

import {
  IMAGE_ASSET_TYPE,
  NODE_TYPES,
  CAMPAIGN_STATE,
  CAMPAIGN_USER_STATE,
} from '#common/enums/index.js'
import {
  CampaignService,
  SystemService,
  AtomService,
} from '#connectors/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { genConnections, closeConnections, testClient } from '../../utils.js'

let connections: Connections
let campaignService: CampaignService
let systemService: SystemService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  campaignService = new CampaignService(connections)
  systemService = new SystemService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const creatorId = '1'
const campaignData = {
  name: 'test',
  applicationPeriod: [new Date('2024-01-01'), new Date('2024-01-02')] as const,
  writingPeriod: [new Date('2024-01-03'), new Date('2024-01-04')] as const,
  creatorId,
}

describe('query campaigns', () => {
  const QUERY_CAMPAIGN = /* GraphQL */ `
    query ($input: CampaignInput!) {
      campaign(input: $input) {
        id
        shortHash
        ... on WritingChallenge {
          nameEn: name(input: { language: en })
          nameZhHant: name(input: { language: zh_hant })
          nameZhHans: name(input: { language: zh_hans })
          descriptionEn: description(input: { language: en })
          descriptionZhHant: description(input: { language: zh_hant })
          descriptionZhHans: description(input: { language: zh_hans })
          cover
          link
          applicationPeriod {
            start
            end
          }
          writingPeriod {
            start
            end
          }
          state
          stages {
            name
            period {
              start
              end
            }
          }
        }
      }
    }
  `
  const QUERY_CAMPAIGNS = /* GraphQL */ `
    query ($input: CampaignsInput!) {
      campaigns(input: $input) {
        edges {
          node {
            ... on WritingChallenge {
              id
              shortHash
              name
              description
              cover
              link
              applicationPeriod {
                start
                end
              }
              writingPeriod {
                start
                end
              }
              state
              stages {
                name
                period {
                  start
                  end
                }
              }
            }
          }
        }
        totalCount
      }
    }
  `
  let pendingCampaignShortHash: string
  let activeCampaignShortHash: string
  beforeAll(async () => {
    const asset = await systemService.findAssetOrCreateByPath(
      {
        uuid: v4(),
        authorId: creatorId,
        type: IMAGE_ASSET_TYPE.campaignCover,
        path: 'test.jpg',
      },
      '1',
      creatorId
    )
    const pendingCampaign = await campaignService.createWritingChallenge({
      ...campaignData,
      coverId: asset.id,
      state: CAMPAIGN_STATE.pending,
    })
    const activeCampaign = await campaignService.createWritingChallenge({
      ...campaignData,
      coverId: asset.id,
      state: CAMPAIGN_STATE.active,
    })
    pendingCampaignShortHash = pendingCampaign.shortHash
    activeCampaignShortHash = activeCampaign.shortHash
  })
  test('query campain successfully', async () => {
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: QUERY_CAMPAIGN,
      variables: { input: { shortHash: activeCampaignShortHash } },
    })
    expect(errors).toBeUndefined()
    expect(data.campaign).toBeDefined()
    expect(data.campaign.nameEn).toBeDefined()
    expect(data.campaign.descriptionEn).toBeDefined()
  })
  test('query campains successfully', async () => {
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: QUERY_CAMPAIGNS,
      variables: { input: { first: 10 } },
    })
    expect(errors).toBeUndefined()
    expect(data.campaigns).toBeDefined()
  })
  test('non-admin users can not query pending/archived campains', async () => {
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: QUERY_CAMPAIGN,
      variables: { input: { shortHash: pendingCampaignShortHash } },
    })
    expect(errors).toBeUndefined()
    expect(data.campaign).toBeNull()
  })
  test('non-admin users query campains with oss true will failed', async () => {
    const server = await testClient({ connections })
    const { errors } = await server.executeOperation({
      query: QUERY_CAMPAIGNS,
      variables: { input: { first: 10, oss: true } },
    })
    expect(errors[0].extensions.code).toBe('FORBIDDEN')
  })
})

describe('application', () => {
  const APPLY_CAMPAIGN = /* GraphQL */ `
    mutation ($input: ApplyCampaignInput!) {
      applyCampaign(input: $input) {
        id
        ... on WritingChallenge {
          application {
            state
            createdAt
          }
        }
      }
    }
  `
  const UPDATE_CAMPAIGN_APPLICATION_STATE = /* GraphQL */ `
    mutation ($input: UpdateCampaignApplicationStateInput!) {
      updateCampaignApplicationState(input: $input) {
        id
        ... on WritingChallenge {
          participants(input: { first: null, oss: true }) {
            totalCount
            edges {
              application {
                state
                createdAt
              }
              node {
                id
              }
            }
          }
        }
      }
    }
  `
  test('apply campaign successfully', async () => {
    const campaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    const user = await atomService.findUnique({
      table: 'user',
      where: { id: '1' },
    })
    const campaignGlobalId = toGlobalId({
      type: NODE_TYPES.Campaign,
      id: campaign.id,
    })
    const userGlobalId = toGlobalId({ type: NODE_TYPES.User, id: user.id })

    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: user },
    })
    const { data, errors } = await server.executeOperation({
      query: APPLY_CAMPAIGN,
      variables: { input: { id: campaignGlobalId } },
    })
    expect(errors).toBeUndefined()
    expect(data.applyCampaign.application.state).toBe(
      CAMPAIGN_USER_STATE.succeeded
    )
    expect(data.applyCampaign.application.createdAt).toBeDefined()

    const adminServer = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })
    const { data: updatedData, errors: updatedErrors } =
      await adminServer.executeOperation({
        query: UPDATE_CAMPAIGN_APPLICATION_STATE,
        variables: {
          input: {
            campaign: campaignGlobalId,
            user: userGlobalId,
            state: CAMPAIGN_USER_STATE.succeeded,
          },
        },
      })
    expect(updatedErrors).toBeUndefined()
    expect(
      updatedData.updateCampaignApplicationState.participants.totalCount
    ).toBe(1)
    expect(
      updatedData.updateCampaignApplicationState.participants.edges[0].node.id
    ).toBe(userGlobalId)
    expect(
      updatedData.updateCampaignApplicationState.participants.edges[0]
        .application.state
    ).toBe(CAMPAIGN_USER_STATE.succeeded)
    expect(
      updatedData.updateCampaignApplicationState.participants.edges[0]
        .application.createdAt
    ).toBeDefined()
  })
})

describe('query users campaigns', () => {
  const GET_VIEWER_CAMPAIGNS = /* GraphQL */ `
    query {
      viewer {
        id
        campaigns(input: { first: 10 }) {
          totalCount
          edges {
            node {
              id
              ... on WritingChallenge {
                stages {
                  name
                }
              }
            }
          }
        }
      }
    }
  `
  let user: User
  beforeAll(async () => {
    user = await atomService.findUnique({
      table: 'user',
      where: { id: '2' },
    })
    const campaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    await campaignService.apply(campaign, user)
    await campaignService.updateStages(campaign.id, [
      { name: 'stage1' },
      { name: 'stage2' },
    ])
  })

  test('query user campaigns successfully', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: user },
    })
    const { data, errors } = await server.executeOperation({
      query: GET_VIEWER_CAMPAIGNS,
    })
    expect(errors).toBeUndefined()
    expect(data.viewer.campaigns.totalCount).toBe(1)
    expect(data.viewer.campaigns.edges[0].node.stages.length).toBe(2)
  })
})

describe('query campaign articles', () => {
  const QUERY_CAMPAIGN_ARTICLES = /* GraphQL */ `
    query (
      $campaignInput: CampaignInput!
      $articlesInput: CampaignArticlesInput!
    ) {
      campaign(input: $campaignInput) {
        id
        shortHash
        ... on WritingChallenge {
          articles(input: $articlesInput) {
            totalCount
            edges {
              node {
                id
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  `
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
  test('query campaign articles w/o filter', async () => {
    const server = await testClient({
      connections,
    })
    const { data, errors } = await server.executeOperation({
      query: QUERY_CAMPAIGN_ARTICLES,
      variables: {
        campaignInput: { shortHash: campaign.shortHash },
        articlesInput: { first: 10 },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.campaign.articles.totalCount).toBe(2)
  })
  test('query campaign articles with stage filter', async () => {
    const server = await testClient({
      connections,
    })
    const stageGlobalId = toGlobalId({
      type: NODE_TYPES.CampaignStage,
      id: stages[0].id,
    })
    const { data, errors } = await server.executeOperation({
      query: QUERY_CAMPAIGN_ARTICLES,
      variables: {
        campaignInput: { shortHash: campaign.shortHash },
        articlesInput: { first: 10, filter: { stage: stageGlobalId } },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.campaign.articles.totalCount).toBe(1)
  })
  test('pagination', async () => {
    const server = await testClient({
      connections,
    })
    const { data, errors } = await server.executeOperation({
      query: QUERY_CAMPAIGN_ARTICLES,
      variables: {
        campaignInput: { shortHash: campaign.shortHash },
        articlesInput: { first: 1 },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.campaign.articles.totalCount).toBe(2)
    expect(data.campaign.articles.edges.length).toBe(1)
    expect(data.campaign.articles.pageInfo.hasNextPage).toBe(true)

    const { data: data2, errors: errors2 } = await server.executeOperation({
      query: QUERY_CAMPAIGN_ARTICLES,
      variables: {
        campaignInput: { shortHash: campaign.shortHash },
        articlesInput: {
          first: 1,
          after: data.campaign.articles.edges[0].cursor,
        },
      },
    })
    expect(errors2).toBeUndefined()
    expect(data2.campaign.articles.totalCount).toBe(2)
    expect(data2.campaign.articles.edges.length).toBe(1)
    expect(data2.campaign.articles.edges[0].node.id).not.toBe(
      data.campaign.articles.edges[0].node.id
    )
    expect(data2.campaign.articles.pageInfo.hasNextPage).toBe(false)
  })
})
