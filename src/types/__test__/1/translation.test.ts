import type { Connections } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { AtomService } from 'connectors'

import { testClient, genConnections, closeConnections } from '../utils'

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const MOCKED_TRANSLATION = 'translated text'

jest.mock('@google-cloud/translate', () => {
  return {
    v3: {
      TranslationServiceClient: function () {
        this.translateText = jest.fn().mockResolvedValue([
          {
            translations: [{ translatedText: 'translated text' }],
          },
        ])
      },
    } as any,
    __esModule: true,
  }
})

describe('article translations', () => {
  const GET_ARTICLE_TRANSLATION = /* GraphQL */ `
    query ($nodeInput: NodeInput!, $translationInput: TranslationArgs!) {
      node(input: $nodeInput) {
        id
        ... on Article {
          translation(input: $translationInput) {
            title
            content
          }
        }
      }
    }
  `
  test('query article translations', async () => {
    const id = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
    const server = await testClient({ connections })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: 'en' },
      },
    })
    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(MOCKED_TRANSLATION)
    expect(data.node.translation.content).toBe(MOCKED_TRANSLATION)
    const atomService = new AtomService(connections)
    const articleTranslation = await atomService.findMany({
      table: 'article_translation',
    })
    articleTranslation.forEach((translation) => {
      expect(translation.title).toBe(MOCKED_TRANSLATION)
      expect(translation.content).toBe(MOCKED_TRANSLATION)
      expect(translation.articleVersionId).not.toBeNull()
    })
  })
})
