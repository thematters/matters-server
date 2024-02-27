import type { Connections } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { AtomService, ArticleService } from 'connectors'

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

describe('article version translations', () => {
  const GET_ARTICLE_TRANSLATION = /* GraphQL */ `
    query ($nodeInput: NodeInput!, $translationInput: TranslationArgs!) {
      node(input: $nodeInput) {
        id
        ... on ArticleVersion {
          translation(input: $translationInput) {
            title
            content
          }
        }
      }
    }
  `
  test('query translations', async () => {
    const id = toGlobalId({ type: NODE_TYPES.ArticleVersion, id: '1' })
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
    const { articleId } = await atomService.findUnique({
      table: 'article_version',
      where: { id: '1' },
    })
    const article = await atomService.findUnique({
      table: 'article',
      where: { id: articleId },
    })
    const articleService = new ArticleService(connections)
    const newArticleVersion = await articleService.createNewArticleVersion(
      articleId,
      article.authorId,
      { title: 'new title' }
    )

    const server2 = await testClient({ connections })
    const id2 = toGlobalId({
      type: NODE_TYPES.ArticleVersion,
      id: newArticleVersion.id,
    })
    const { error: error2, data: data2 } = await server2.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id: id2 },
        translationInput: { language: 'en' },
      },
    })
    expect(error2).toBeUndefined()
    expect(data2.node.translation.title).toBe(MOCKED_TRANSLATION)
    expect(data2.node.translation.content).toBe(MOCKED_TRANSLATION)
  })
  test('query paywall article_version translations by unauthorized readers return empty string ', async () => {
    const articleId = '1'
    const id = toGlobalId({ type: NODE_TYPES.ArticleVersion, id: articleId })
    const server = await testClient({ connections })

    const atomService = new AtomService(connections)
    const circle = await atomService.create({
      table: 'circle',
      data: {
        name: 'test',
        owner: '1',
        displayName: 'test',
        providerProductId: '1',
      },
    })
    await atomService.create({
      table: 'article_circle',
      data: { articleId, circleId: circle.id },
    })

    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: 'en' },
      },
    })
    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(MOCKED_TRANSLATION)
    expect(data.node.translation.content).toBe('')
  })
})
