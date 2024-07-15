import type {
  Connections,
  User,
  Campaign,
  CampaignStage,
  Article,
} from 'definitions'

import { v4 } from 'uuid'

import {
  IMAGE_ASSET_TYPE,
  LANGUAGE,
  NODE_TYPES,
  CAMPAIGN_STATE,
  CAMPAIGN_USER_STATE,
} from 'common/enums'
import { CampaignService, SystemService, AtomService } from 'connectors'
import { toGlobalId } from 'common/utils'

import { genConnections, closeConnections, testClient } from '../utils'

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

const userId = '1'
const campaignData = {
  name: 'test',
  description: 'test',
  link: 'https://test.com',
  applicationPeriod: [new Date('2024-01-01'), new Date('2024-01-02')] as const,
  writingPeriod: [new Date('2024-01-03'), new Date('2024-01-04')] as const,
  creatorId: '1',
}

describe('create or update wrting challenges', () => {
  const PUT_WRITING_CHALLENGE = /* GraphQL */ `
    mutation ($input: PutWritingChallengeInput!) {
      putWritingChallenge(input: $input) {
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
        stages {
          id
          name
          period {
            start
            end
          }
        }
        state
      }
    }
  `
  const translationsCampaign = [
    {
      text: 'test campaign ' + LANGUAGE.zh_hant,
      language: LANGUAGE.zh_hant,
    },
    { text: 'test campaign ' + LANGUAGE.zh_hans, language: LANGUAGE.zh_hans },
    { text: 'test campaign ' + LANGUAGE.en, language: LANGUAGE.en },
  ]
  const translationsStage = [
    {
      text: 'test stage ' + LANGUAGE.zh_hant,
      language: LANGUAGE.zh_hant,
    },
    { text: 'test stage ' + LANGUAGE.zh_hans, language: LANGUAGE.zh_hans },
    { text: 'test stage ' + LANGUAGE.en, language: LANGUAGE.en },
  ]
  const name = translationsCampaign
  const description = translationsCampaign
  let admin: User
  let normalUser: User
  let cover: string
  const link = 'https://test.com'
  const applicationPeriod = {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-02'),
  }
  const writingPeriod = {
    start: new Date('2024-01-03'),
    end: new Date('2024-01-04'),
  }
  const stages = [
    {
      name: translationsStage,
      period: {
        start: new Date('2024-01-03'),
        end: new Date('2024-01-04'),
      },
    },
  ]
  beforeAll(async () => {
    admin = await atomService.findFirst({
      table: 'user',
      where: { role: 'admin' },
    })
    normalUser = await atomService.findFirst({
      table: 'user',
      where: { role: 'user' },
    })
    const asset = await systemService.findAssetOrCreateByPath(
      {
        uuid: v4(),
        authorId: admin.id,
        type: IMAGE_ASSET_TYPE.campaignCover,
        path: 'test.jpg',
      },
      '1',
      admin.id
    )
    cover = asset.uuid
  })
  test('create success', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })
    const { data, errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          description,
          cover,
          link,
          applicationPeriod,
          writingPeriod,
          stages,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putWritingChallenge.shortHash).toBeDefined()

    // create with only name
    const { data: data2, errors: errors2 } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
        },
      },
    })
    expect(errors2).toBeUndefined()
    expect(data2.putWritingChallenge.shortHash).toBeDefined()
  })
  test('stage period can be unbounded', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })
    const stagesUnbounded = [
      {
        name: translationsCampaign,
        period: {
          start: new Date('2024-01-03'),
        },
      },
    ]
    const { data, errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          description,
          cover,
          link,
          applicationPeriod,
          writingPeriod,
          stages: stagesUnbounded,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putWritingChallenge.stages[0].period.end).toBeNull()
  })

  test('update', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })
    const { data } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          description,
          cover,
          link,
          applicationPeriod,
          writingPeriod,
          stages,
        },
      },
    })

    // update campaign

    const newName = Object.keys(LANGUAGE).map((lang) => ({
      text: 'updated ' + lang,
      language: lang,
    }))
    const newStages = [
      {
        name: Object.keys(LANGUAGE).map((lang) => ({
          text: 'updated stage ' + lang,
          language: lang,
        })),
      },
    ]

    const { data: updatedData, errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          id: data.putWritingChallenge.id,
          name: newName,
          stages: newStages,
          state: CAMPAIGN_STATE.active,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(updatedData.putWritingChallenge.name).toContain('updated')
    expect(updatedData.putWritingChallenge.stages[0].name).toContain('updated')
    expect(updatedData.putWritingChallenge.state).toBe(CAMPAIGN_STATE.active)

    // update stages when campaign is active will failed
    const { errors: updateErrors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          id: data.putWritingChallenge.id,
          stages: newStages,
        },
      },
    })
    expect(updateErrors[0].extensions.code).toBe('ACTION_FAILED')
  })
  test('user without admin role can not create', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: normalUser },
    })
    const { errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          description,
          cover,
          link,
          applicationPeriod,
          writingPeriod,
          stages,
        },
      },
    })
    expect(errors[0].extensions.code).toBe('FORBIDDEN')
  })
})

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
        authorId: userId,
        type: IMAGE_ASSET_TYPE.campaignCover,
        path: 'test.jpg',
      },
      '1',
      userId
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
          applicationState
        }
      }
    }
  `
  const UPDATE_CAMPAIGN_APPLICATION_STATE = /* GraphQL */ `
    mutation ($input: UpdateCampaignApplicationStateInput!) {
      updateCampaignApplicationState(input: $input) {
        id
        ... on WritingChallenge {
          participants(input: { first: null }) {
            totalCount
            edges {
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
    expect(data.applyCampaign.applicationState).toBe(
      CAMPAIGN_USER_STATE.pending
    )

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
                applicationState
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
    const application = await campaignService.apply(campaign, user)
    await campaignService.approve(application.id)
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
  })
})

describe('query users campaigns', () => {
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
    const application = await campaignService.apply(campaign, user)
    await campaignService.approve(application.id)
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
})
