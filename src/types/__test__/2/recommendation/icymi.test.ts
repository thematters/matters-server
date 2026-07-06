import type { Connections } from '#definitions/index.js'

import _ from 'lodash'

import {
  NODE_TYPES,
  MATTERS_CHOICE_TOPIC_STATE,
  LANGUAGE,
} from '#common/enums/index.js'
import { RecommendationService, AtomService } from '#connectors/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections
let recommendationService: RecommendationService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  recommendationService = new RecommendationService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('icymi', () => {
  const GET_VIEWER_RECOMMENDATION_ICYMI = /* GraphQL */ `
    query ($input: ConnectionArgs!) {
      viewer {
        recommendation {
          icymi(input: $input) {
            totalCount
            edges {
              node {
                ... on Article {
                  id
                  author {
                    id
                  }
                  slug
                  state
                  cover
                  summary
                  mediaHash
                  dataHash
                  iscnId
                  createdAt
                  revisedAt
                  createdAt
                }
              }
            }
          }
        }
      }
    }
  `
  test('query', async () => {
    const server = await testClient({ connections })
    await atomService.create({
      table: 'matters_choice',
      data: { articleId: '1' },
    })
    const { errors, data } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_ICYMI,
      variables: { input: { first: 10 } },
    })
    expect(errors).toBeUndefined()
    expect(data.viewer.recommendation.icymi.totalCount).toBeGreaterThan(0)
  })
})

describe('icymi topic', () => {
  describe('oss', () => {
    const PUT_ICYMI_TOPIC = /* GraphQL */ `
      mutation ($input: PutIcymiTopicInput!) {
        putIcymiTopic(input: $input) {
          id
          title
          articles {
            id
          }
          note
          pinAmount
          state
          publishedAt
          archivedAt
        }
      }
    `
    const GET_OSS_ICYMI_TOPIC = /* GraphQL */ `
      query ($input: NodeInput!) {
        node(input: $input) {
          id
          ... on IcymiTopic {
            title
            articles {
              id
            }
            note
            state
            publishedAt
            archivedAt
          }
        }
      }
    `
    const GET_OSS_ICYMI_TOPIC_WITH_TRANSLATION = /* GraphQL */ `
      query (
        $input: NodeInput!
        $titleInput: TranslationArgs
        $noteInput: TranslationArgs
      ) {
        node(input: $input) {
          id
          ... on IcymiTopic {
            title(input: $titleInput)
            articles {
              id
            }
            note(input: $noteInput)
            state
            publishedAt
            archivedAt
          }
        }
      }
    `
    const GET_OSS_ICYMI_TOPICS = /* GraphQL */ `
      query ($input: ConnectionArgs!) {
        oss {
          icymiTopics(input: $input) {
            totalCount
            edges {
              node {
                id
                ... on IcymiTopic {
                  title
                  articles {
                    id
                  }
                  note
                  state
                  publishedAt
                  archivedAt
                }
              }
            }
          }
        }
      }
    `
    const title = [{ language: 'en', text: 'test title' }]
    const pinAmount = 3
    const articles = ['1', '2', '3'].map((id) =>
      toGlobalId({ type: NODE_TYPES.Article, id })
    )
    const note = [{ language: 'en', text: 'test note' }]
    test('only admin can mutate icymit topic', async () => {
      const server = await testClient({ connections })
      const { errors: errorsVisitor } = await server.executeOperation({
        query: PUT_ICYMI_TOPIC,
        variables: { input: { title, articles, pinAmount, note } },
      })
      expect(errorsVisitor).toBeDefined()

      const authedServer = await testClient({ connections, isAuth: true })
      const { errors: errorsAuthed } = await authedServer.executeOperation({
        query: PUT_ICYMI_TOPIC,
        variables: { input: { title, articles, pinAmount, note } },
      })
      expect(errorsAuthed).toBeDefined()

      const adminServer = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })
      const { errors, data } = await adminServer.executeOperation({
        query: PUT_ICYMI_TOPIC,
        variables: { input: { title, articles, pinAmount, note } },
      })
      expect(errors).toBeUndefined()
      expect(data.putIcymiTopic.state).toBe(MATTERS_CHOICE_TOPIC_STATE.editing)
      expect(data.putIcymiTopic.pinAmount).toBe(3)
      expect(data.putIcymiTopic.articles.length).toBe(3)
      expect(data.putIcymiTopic.publishedAt).toBeNull()
      expect(data.putIcymiTopic.archivedAt).toBeNull()

      // only update fields provided
      const { data: data2, errors: errors2 } =
        await adminServer.executeOperation({
          query: PUT_ICYMI_TOPIC,
          variables: { input: { id: data.putIcymiTopic.id, pinAmount: 6 } },
        })
      expect(errors2).toBeUndefined()
      expect(data2.putIcymiTopic.pinAmount).toBe(6)
      expect(data2.putIcymiTopic.state).toBe(MATTERS_CHOICE_TOPIC_STATE.editing)
      expect(data2.putIcymiTopic.articles.length).toBe(3)
      expect(data2.putIcymiTopic.publishedAt).toBeNull()
      expect(data2.putIcymiTopic.archivedAt).toBeNull()
    })

    test('validates title and note length limits', async () => {
      const adminServer = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      // Test title too long
      const longTitle = [{ language: 'en', text: 'a'.repeat(101) }]
      const { errors: titleErrors } = await adminServer.executeOperation({
        query: PUT_ICYMI_TOPIC,
        variables: { input: { title: longTitle, pinAmount: 3 } },
      })
      expect(titleErrors).toBeDefined()
      expect(titleErrors?.[0]?.message).toContain('Title is too long')

      // Test note too long
      const longNote = [{ language: 'en', text: 'a'.repeat(201) }]
      const { errors: noteErrors } = await adminServer.executeOperation({
        query: PUT_ICYMI_TOPIC,
        variables: { input: { title, note: longNote, pinAmount: 3 } },
      })
      expect(noteErrors).toBeDefined()
      expect(noteErrors?.[0]?.message).toContain('Note is too long')
    })

    test('only admin can views icymit topics list', async () => {
      const server = await testClient({ connections })
      const { data: dataVisitor } = await server.executeOperation({
        query: GET_OSS_ICYMI_TOPICS,
        variables: { input: { first: 10 } },
      })
      expect(dataVisitor).toBeNull()

      const authedServer = await testClient({ connections, isAuth: true })
      const { data: dataAuthed } = await authedServer.executeOperation({
        query: GET_OSS_ICYMI_TOPICS,
        variables: { input: { first: 10 } },
      })
      expect(dataAuthed).toBe(null)

      const adminServer = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })
      const { errors, data } = await adminServer.executeOperation({
        query: GET_OSS_ICYMI_TOPICS,
        variables: { input: { first: 10 } },
      })
      expect(errors).toBeUndefined()
      expect(data.oss.icymiTopics.totalCount).toBeGreaterThan(0)
    })
    test('query icymi topic', async () => {
      const server = await testClient({ connections })
      const { data } = await server.executeOperation({
        query: GET_OSS_ICYMI_TOPIC,
        variables: {
          input: { id: toGlobalId({ type: NODE_TYPES.IcymiTopic, id: 1 }) },
        },
      })
      expect(data).toBeDefined()
    })

    test('query icymi topic with translation arguments', async () => {
      const adminServer = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      // Create a topic with multiple translations
      const multiLangTitle = [
        { language: LANGUAGE.en, text: 'English Title' },
        { language: LANGUAGE.zh_hans, text: '中文标题' },
      ]
      const multiLangNote = [
        { language: LANGUAGE.en, text: 'English Note' },
        { language: LANGUAGE.zh_hans, text: '中文备注' },
      ]

      const { data: createData } = await adminServer.executeOperation({
        query: PUT_ICYMI_TOPIC,
        variables: {
          input: {
            title: multiLangTitle,
            note: multiLangNote,
            pinAmount: 3,
          },
        },
      })

      const topicId = createData.putIcymiTopic.id

      // Test querying with English translation
      const { data: enData } = await adminServer.executeOperation({
        query: GET_OSS_ICYMI_TOPIC_WITH_TRANSLATION,
        variables: {
          input: { id: topicId },
          titleInput: { language: 'en' },
          noteInput: { language: 'en' },
        },
      })
      expect(enData.node.title).toBe('English Title')
      expect(enData.node.note).toBe('English Note')

      // Test querying with Chinese translation
      const { data: zhData } = await adminServer.executeOperation({
        query: GET_OSS_ICYMI_TOPIC_WITH_TRANSLATION,
        variables: {
          input: { id: topicId },
          titleInput: { language: 'zh_hans' },
          noteInput: { language: 'zh_hans' },
        },
      })
      expect(zhData.node.title).toBe('中文标题')
      expect(zhData.node.note).toBe('中文备注')

      // Test querying without translation args (should use viewer language)
      const { data: defaultData } = await adminServer.executeOperation({
        query: GET_OSS_ICYMI_TOPIC_WITH_TRANSLATION,
        variables: {
          input: { id: topicId },
        },
      })
      expect(defaultData.node.title).toBeDefined()
      expect(defaultData.node.note).toBeDefined()
    })
  })

  const GET_VIEWER_RECOMMENDATION_ICYMI_TOPIC = /* GraphQL */ `
    query {
      viewer {
        recommendation {
          icymiTopic {
            id
            title
            articles {
              id
            }
            note
            state
            publishedAt
            archivedAt
          }
        }
      }
    }
  `

  const GET_VIEWER_RECOMMENDATION_ICYMI_TOPIC_WITH_TRANSLATION = /* GraphQL */ `
    query ($titleInput: TranslationArgs, $noteInput: TranslationArgs) {
      viewer {
        recommendation {
          icymiTopic {
            id
            title(input: $titleInput)
            articles {
              id
            }
            note(input: $noteInput)
            state
            publishedAt
            archivedAt
          }
        }
      }
    }
  `

  test('query null', async () => {
    const server = await testClient({ connections })
    await atomService.updateMany({
      table: 'matters_choice_topic',
      where: { state: MATTERS_CHOICE_TOPIC_STATE.published },
      data: { state: MATTERS_CHOICE_TOPIC_STATE.archived },
    })
    const { errors, data } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_ICYMI_TOPIC,
    })
    expect(errors).toBeUndefined()
    expect(data.viewer.recommendation.icymiTopic).toBeNull()
  })
  test('query', async () => {
    const title = 'test title 2'
    const articleIds = ['1', '2', '3']
    const topic = await recommendationService.createIcymiTopic({
      title,
      articleIds,
      pinAmount: 3,
    })
    await recommendationService.publishIcymiTopic(topic.id)
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_ICYMI_TOPIC,
    })
    expect(errors).toBeUndefined()
    expect(data.viewer.recommendation.icymiTopic.title).toBe(title)
    expect(data.viewer.recommendation.icymiTopic.articles.length).toBe(
      articleIds.length
    )
  })

  test('query with translation arguments', async () => {
    // Create and publish a topic with translations using the service directly
    const multiLangTitle = [
      { language: LANGUAGE.en, text: 'Published English Title' },
      { language: LANGUAGE.zh_hant, text: '已發佈中文標題' },
    ]
    const multiLangNote = [
      { language: LANGUAGE.en, text: 'Published English Note' },
      { language: LANGUAGE.zh_hant, text: '已發佈中文備註' },
    ]

    const topic = await recommendationService.createIcymiTopic({
      title: multiLangTitle[0].text,
      articleIds: ['1', '2', '3'],
      pinAmount: 3,
      note: multiLangNote[0].text,
    })

    // Add translations using translation service
    const { TranslationService } = await import('#connectors/index.js')
    const translationService = new TranslationService(connections)

    for (const trans of multiLangTitle) {
      await translationService.updateOrCreateTranslation({
        table: 'matters_choice_topic',
        field: 'title',
        id: topic.id,
        language: trans.language,
        text: trans.text,
      })
    }

    for (const trans of multiLangNote) {
      await translationService.updateOrCreateTranslation({
        table: 'matters_choice_topic',
        field: 'note',
        id: topic.id,
        language: trans.language,
        text: trans.text,
      })
    }

    await recommendationService.publishIcymiTopic(topic.id)

    // Test viewer query with English translation
    const server = await testClient({ connections })
    const { data: enData } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_ICYMI_TOPIC_WITH_TRANSLATION,
      variables: {
        titleInput: { language: 'en' },
        noteInput: { language: 'en' },
      },
    })
    expect(enData.viewer.recommendation.icymiTopic.title).toBe(
      'Published English Title'
    )
    expect(enData.viewer.recommendation.icymiTopic.note).toBe(
      'Published English Note'
    )

    // Test viewer query with Chinese translation
    const { data: zhData } = await server.executeOperation({
      query: GET_VIEWER_RECOMMENDATION_ICYMI_TOPIC_WITH_TRANSLATION,
      variables: {
        titleInput: { language: LANGUAGE.zh_hant },
        noteInput: { language: LANGUAGE.zh_hant },
      },
    })
    expect(zhData.viewer.recommendation.icymiTopic.title).toBe('已發佈中文標題')
    expect(zhData.viewer.recommendation.icymiTopic.note).toBe('已發佈中文備註')
  })
})
