import type { User, Connections } from '#definitions/index.js'
import { v4 } from 'uuid'

import {
  IMAGE_ASSET_TYPE,
  LANGUAGE,
  NODE_TYPES,
  CAMPAIGN_STATE,
} from '#common/enums/index.js'
import { SystemService, AtomService } from '#connectors/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { genConnections, closeConnections, testClient } from '../../utils.js'

let connections: Connections
let systemService: SystemService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  systemService = new SystemService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('create or update writing challenges', () => {
  const PUT_WRITING_CHALLENGE = /* GraphQL */ `
    mutation ($input: PutWritingChallengeInput!) {
      putWritingChallenge(input: $input) {
        id
        shortHash
        name
        navbarTitle(input: { language: en })
        description
        cover
        link
        featuredDescription
        announcements {
          id
          title
        }
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
          name(input: { language: en })
          description(input: { language: en })
          period {
            start
            end
          }
        }
        oss {
          managers {
            id
            userName
          }
          exclusive
        }
        state
        channelEnabled
        showOther
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

  const translationsFeaturedDescription = [
    {
      text: 'test featured description ' + LANGUAGE.zh_hant,
      language: LANGUAGE.zh_hant,
    },
    {
      text: 'test featured description ' + LANGUAGE.zh_hans,
      language: LANGUAGE.zh_hans,
    },
    { text: 'test featured description ' + LANGUAGE.en, language: LANGUAGE.en },
  ]

  const translationsDescription = [
    {
      text: 'test description ' + LANGUAGE.zh_hant,
      language: LANGUAGE.zh_hant,
    },
    {
      text: 'test description ' + LANGUAGE.zh_hans,
      language: LANGUAGE.zh_hans,
    },
    { text: 'test description ' + LANGUAGE.en, language: LANGUAGE.en },
  ]

  const translationsStageName1 = [
    {
      text: 'test stage 1 ' + LANGUAGE.zh_hant,
      language: LANGUAGE.zh_hant,
    },
    { text: 'test stage 1 ' + LANGUAGE.zh_hans, language: LANGUAGE.zh_hans },
    { text: 'test stage 1 ' + LANGUAGE.en, language: LANGUAGE.en },
  ]

  const translationsStageName2 = [
    {
      text: 'test stage 2 ' + LANGUAGE.zh_hant,
      language: LANGUAGE.zh_hant,
    },
    { text: 'test stage 2 ' + LANGUAGE.zh_hans, language: LANGUAGE.zh_hans },
    { text: 'test stage 2 ' + LANGUAGE.en, language: LANGUAGE.en },
  ]

  const translationsStageDescription = [
    {
      text: 'test stage description ' + LANGUAGE.zh_hant,
      language: LANGUAGE.zh_hant,
    },
    {
      text: 'test stage description ' + LANGUAGE.zh_hans,
      language: LANGUAGE.zh_hans,
    },
    { text: 'test stage description ' + LANGUAGE.en, language: LANGUAGE.en },
  ]

  const translationsNavbarTitle = [
    {
      text: 'test navbar title ' + LANGUAGE.zh_hant,
      language: LANGUAGE.zh_hant,
    },
    {
      text: 'test navbar title ' + LANGUAGE.zh_hans,
      language: LANGUAGE.zh_hans,
    },
    { text: 'test navbar title ' + LANGUAGE.en, language: LANGUAGE.en },
  ]

  const name = translationsCampaign
  let admin: User
  let normalUser: User
  let cover: string

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
      name: translationsStageName1,
      description: [],
      period: {
        start: new Date('2024-01-03'),
        end: new Date('2024-01-04'),
      },
    },
    {
      name: translationsStageName2,
      description: translationsStageDescription,
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

  test('empty range not allowed', async () => {
    const time = new Date()
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })
    const { errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          cover,
          applicationPeriod: { start: time, end: time },
          writingPeriod,
          stages,
          featuredDescription: translationsFeaturedDescription,
        },
      },
    })
    expect(errors[0].extensions.code).toBe('BAD_USER_INPUT')
  })

  test('create success', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })
    const announcementGlobalId = toGlobalId({
      type: NODE_TYPES.Article,
      id: '1',
    })
    const { data, errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          cover,
          description: translationsDescription,
          announcements: [announcementGlobalId],
          writingPeriod,
          stages,
          featuredDescription: translationsFeaturedDescription,
          exclusive: true,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putWritingChallenge.shortHash).toBeDefined()
    expect(data.putWritingChallenge.announcements[0].id).toBe(
      announcementGlobalId
    )
    expect(data.putWritingChallenge.description).toContain('test description')
    expect(data.putWritingChallenge.featuredDescription).toContain(
      'test featured description'
    )
    expect(data.putWritingChallenge.stages[0].description).toBe('')
    expect(data.putWritingChallenge.stages[1].description).toContain(
      'test stage description'
    )
    expect(data.putWritingChallenge.channelEnabled).toBe(false)
    expect(data.putWritingChallenge.showOther).toBe(true)
    expect(data.putWritingChallenge.oss.exclusive).toBe(true)

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
    expect(data2.putWritingChallenge.channelEnabled).toBe(false)
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
          cover,
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
          cover,
          description: translationsDescription,
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
    const newDescription = Object.keys(LANGUAGE).map((lang) => ({
      text: 'updated description ' + lang,
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
          description: newDescription,
          stages: newStages,
          state: CAMPAIGN_STATE.active,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(updatedData.putWritingChallenge.name).toContain('updated')
    expect(updatedData.putWritingChallenge.description).toContain(
      'updated description'
    )
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

  test('update channel enabled', async () => {
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
          cover,
          description: translationsDescription,
          applicationPeriod,
          writingPeriod,
          stages,
          channelEnabled: false,
        },
      },
    })

    expect(data.putWritingChallenge.channelEnabled).toBe(false)

    // update channel enabled
    const { data: updatedData, errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          id: data.putWritingChallenge.id,
          state: CAMPAIGN_STATE.active,
          channelEnabled: true,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(updatedData.putWritingChallenge.channelEnabled).toBe(true)

    // update channel disabled
    const { data: updatedData2, errors: errors2 } =
      await server.executeOperation({
        query: PUT_WRITING_CHALLENGE,
        variables: {
          input: {
            id: data.putWritingChallenge.id,
            channelEnabled: false,
          },
        },
      })
    expect(errors2).toBeUndefined()
    expect(updatedData2.putWritingChallenge.channelEnabled).toBe(false)
  })

  test('can enable channel for pending campaign', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create a campaign in pending state
    const { data } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          state: CAMPAIGN_STATE.pending,
        },
      },
    })

    // Attempt to enable channel for pending campaign
    const { errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          id: data.putWritingChallenge.id,
          channelEnabled: true,
        },
      },
    })

    expect(errors).toBeUndefined()
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
          cover,
          applicationPeriod,
          writingPeriod,
          stages,
        },
      },
    })
    expect(errors[0].extensions.code).toBe('FORBIDDEN')
  })

  test('admin users management', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create a campaign with admin users
    const manager1GlobalId = toGlobalId({
      type: NODE_TYPES.User,
      id: '1',
    })
    const manager2GlobalId = toGlobalId({
      type: NODE_TYPES.User,
      id: '2',
    })

    // First create a campaign with admin users
    const { data: createData, errors: createErrors } =
      await server.executeOperation({
        query: PUT_WRITING_CHALLENGE,
        variables: {
          input: {
            name,
            managers: [manager1GlobalId, manager2GlobalId],
          },
        },
      })
    expect(createErrors).toBeUndefined()
    expect(createData.putWritingChallenge.oss.managers.length).toBe(2)

    // Update campaign to modify admin users
    const { data: updateData, errors: updateErrors } =
      await server.executeOperation({
        query: PUT_WRITING_CHALLENGE,
        variables: {
          input: {
            id: createData.putWritingChallenge.id,
            managers: [manager1GlobalId], // Remove manager2
          },
        },
      })
    expect(updateErrors).toBeUndefined()
    expect(updateData.putWritingChallenge.oss.managers.length).toBe(1)
    expect(updateData.putWritingChallenge.oss.managers[0].id).toBe(
      manager1GlobalId
    )

    // Clear all admin users
    const { data: clearData, errors: clearErrors } =
      await server.executeOperation({
        query: PUT_WRITING_CHALLENGE,
        variables: {
          input: {
            id: createData.putWritingChallenge.id,
            managers: [], // Remove all managers
          },
        },
      })
    expect(clearErrors).toBeUndefined()
    expect(clearData.putWritingChallenge.oss.managers.length).toBe(0)

    // Test with invalid user ID
    const invalidUserGlobalId = toGlobalId({
      type: NODE_TYPES.User,
      id: '99999', // Non-existent user ID
    })
    const { errors: invalidErrors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          managers: [invalidUserGlobalId],
        },
      },
    })
    expect(invalidErrors[0].extensions.code).toBe('BAD_USER_INPUT')
  })

  test('update exclusive status', async () => {
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
          cover,
          description: translationsDescription,
          applicationPeriod,
          writingPeriod,
          stages,
          exclusive: false,
        },
      },
    })

    expect(data.putWritingChallenge.oss.exclusive).toBe(false)

    // update exclusive to true
    const { data: updatedData, errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          id: data.putWritingChallenge.id,
          exclusive: true,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(updatedData.putWritingChallenge.oss.exclusive).toBe(true)

    // update exclusive to false
    const { data: updatedData2, errors: errors2 } =
      await server.executeOperation({
        query: PUT_WRITING_CHALLENGE,
        variables: {
          input: {
            id: data.putWritingChallenge.id,
            exclusive: false,
          },
        },
      })
    expect(errors2).toBeUndefined()
    expect(updatedData2.putWritingChallenge.oss.exclusive).toBe(false)
  })

  test('default exclusive value is false', async () => {
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
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putWritingChallenge.oss.exclusive).toBe(false)
  })

  test('create with navbarTitle', async () => {
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
          cover,
          description: translationsDescription,
          navbarTitle: translationsNavbarTitle,
          applicationPeriod,
          writingPeriod,
          stages,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putWritingChallenge.navbarTitle).toContain('test navbar title')
  })

  test('update navbarTitle', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })

    // First create a campaign
    const { data: createData } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          cover,
          description: translationsDescription,
          applicationPeriod,
          writingPeriod,
          stages,
        },
      },
    })

    // Update navbarTitle
    const newNavbarTitle = Object.keys(LANGUAGE).map((lang) => ({
      text: 'updated navbar title ' + lang,
      language: lang,
    }))

    const { data: updateData, errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          id: createData.putWritingChallenge.id,
          navbarTitle: newNavbarTitle,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(updateData.putWritingChallenge.navbarTitle).toContain(
      'updated navbar title'
    )
  })

  test('navbarTitle fallback to name when not provided', async () => {
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
          cover,
          description: translationsDescription,
          applicationPeriod,
          writingPeriod,
          stages,
        },
      },
    })
    expect(errors).toBeUndefined()
    // When navbarTitle is not provided, it should fallback to name
    expect(data.putWritingChallenge.navbarTitle).toContain('test campaign')
  })

  test('navbarTitle with channel enabled', async () => {
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
          cover,
          description: translationsDescription,
          navbarTitle: translationsNavbarTitle,
          applicationPeriod,
          writingPeriod,
          stages,
          channelEnabled: true,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putWritingChallenge.navbarTitle).toContain('test navbar title')
    expect(data.putWritingChallenge.channelEnabled).toBe(true)
  })

  test('update navbarTitle with channel enabled', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })

    // First create a campaign with channel enabled
    const { data: createData } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          cover,
          description: translationsDescription,
          applicationPeriod,
          writingPeriod,
          stages,
          channelEnabled: true,
        },
      },
    })

    // Update navbarTitle when channel is enabled
    const newNavbarTitle = Object.keys(LANGUAGE).map((lang) => ({
      text: 'channel navbar title ' + lang,
      language: lang,
    }))

    const { data: updateData, errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          id: createData.putWritingChallenge.id,
          navbarTitle: newNavbarTitle,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(updateData.putWritingChallenge.navbarTitle).toContain(
      'channel navbar title'
    )
  })

  test('navbarTitle with empty translations array', async () => {
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
          cover,
          description: translationsDescription,
          navbarTitle: [],
          applicationPeriod,
          writingPeriod,
          stages,
        },
      },
    })
    expect(errors).toBeUndefined()
    // When navbarTitle is empty array, it should fallback to name
    expect(data.putWritingChallenge.navbarTitle).toContain('test campaign')
  })

  test('navbarTitle with partial translations', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })
    const partialNavbarTitle = [
      {
        text: 'partial navbar title ' + LANGUAGE.en,
        language: LANGUAGE.en,
      },
    ]
    const { data, errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          name,
          cover,
          description: translationsDescription,
          navbarTitle: partialNavbarTitle,
          applicationPeriod,
          writingPeriod,
          stages,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putWritingChallenge.navbarTitle).toContain(
      'partial navbar title'
    )
  })

  test('update showOther', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })
    const { data } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: { name },
      },
    })
    expect(data.putWritingChallenge.showOther).toBe(true)

    const { data: updateData, errors } = await server.executeOperation({
      query: PUT_WRITING_CHALLENGE,
      variables: {
        input: {
          id: data.putWritingChallenge.id,
          showOther: false,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(updateData.putWritingChallenge.showOther).toBe(false)
  })
})
