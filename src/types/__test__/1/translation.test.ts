import type { Connections } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { AtomService, ArticleService, OpenRouter } from '#connectors/index.js'

import { testClient, genConnections, closeConnections } from '../utils.js'

let connections: Connections
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const GOOGLE_TRANSLATION = 'Google translated text'
const LLM_TRANSLATION = 'LLM translated text'

describe('article translations', () => {
  const GET_ARTICLE_TRANSLATION = /* GraphQL */ `
    query (
      $nodeInput: NodeInput!
      $translationInput: ArticleTranslationInput!
    ) {
      node(input: $nodeInput) {
        id
        ... on Article {
          translation(input: $translationInput) {
            title
            content
            model
          }
        }
      }
    }
  `

  beforeEach(async () => {
    await atomService.deleteMany({
      table: 'article_translation',
      where: {},
    })
  })

  test('query article translations with valid translation model', async () => {
    const articleId = '1'
    const model = 'google_gemini_2_5_flash_preview'

    // Get article versions to link translations
    const articleVersions = await atomService.findMany({
      table: 'article_version',
      where: { articleId },
    })

    // Create translation records directly
    for (const version of articleVersions) {
      await atomService.create({
        table: 'article_translation',
        data: {
          articleId,
          articleVersionId: version.id,
          language: 'en',
          title: LLM_TRANSLATION,
          content: LLM_TRANSLATION,
          model,
        },
      })
    }

    const id = toGlobalId({ type: NODE_TYPES.Article, id: articleId })
    const server = await testClient({ connections })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: 'en', model },
      },
    })

    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(LLM_TRANSLATION)
    expect(data.node.translation.content).toBe(LLM_TRANSLATION)
    expect(data.node.translation.model).toBe(model)
  })

  test('query article translations with deprecated model throws error', async () => {
    const articleId = '1'
    const id = toGlobalId({ type: NODE_TYPES.Article, id: articleId })
    const server = await testClient({ connections })
    const { errors } = await server.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: 'en', model: 'google_translation_v2' },
      },
    })

    expect(errors).toBeDefined()
    expect(errors?.[0].message).toContain(
      'google_translation_v2" is no longer supported'
    )
  })

  test('query article translations with specific LLM model', async () => {
    const articleId = '1'

    // Get article versions to link translations
    const articleVersions = await atomService.findMany({
      table: 'article_version',
      where: { articleId },
    })

    // Create translation records directly with LLM model
    for (const version of articleVersions) {
      await atomService.create({
        table: 'article_translation',
        data: {
          articleId,
          articleVersionId: version.id,
          language: 'en',
          title: LLM_TRANSLATION,
          content: LLM_TRANSLATION,
          model: 'google_gemini_2_5_flash_preview',
        },
      })
    }

    const id = toGlobalId({ type: NODE_TYPES.Article, id: articleId })
    const server = await testClient({ connections })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: {
          language: 'en',
          model: 'google_gemini_2_5_flash_preview',
        },
      },
    })

    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(LLM_TRANSLATION)
    expect(data.node.translation.content).toBe(LLM_TRANSLATION)
    expect(data.node.translation.model).toBe('google_gemini_2_5_flash_preview')
  })
})

describe('article version translations', () => {
  const GET_ARTICLE_VERSION_TRANSLATION = /* GraphQL */ `
    query (
      $nodeInput: NodeInput!
      $translationInput: ArticleTranslationInput!
    ) {
      node(input: $nodeInput) {
        id
        ... on ArticleVersion {
          translation(input: $translationInput) {
            title
            content
            model
          }
        }
      }
    }
  `

  beforeEach(async () => {
    await atomService.deleteMany({
      table: 'article_translation',
      where: {},
    })
  })

  test('query translations with default model', async () => {
    const articleVersionId = '1'
    const openRouter = new OpenRouter()
    const model = openRouter.toDatabaseModel(openRouter.defaultModel)

    const { articleId } = await atomService.findUnique({
      table: 'article_version',
      where: { id: articleVersionId },
    })

    // Create translation record directly with default model
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId,
        articleVersionId,
        language: 'en',
        title: GOOGLE_TRANSLATION,
        content: GOOGLE_TRANSLATION,
        model,
      },
    })

    const id = toGlobalId({
      type: NODE_TYPES.ArticleVersion,
      id: articleVersionId,
    })
    const server = await testClient({ connections })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_VERSION_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: 'en' },
      },
    })

    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(GOOGLE_TRANSLATION)
    expect(data.node.translation.content).toBe(GOOGLE_TRANSLATION)
    expect(data.node.translation.model).toBe(model)
  })

  test('query translations with specific LLM model', async () => {
    const articleVersionId = '1'
    const model = 'openai_gpt_4_1_nano'

    const { articleId } = await atomService.findUnique({
      table: 'article_version',
      where: { id: articleVersionId },
    })

    // Create translation record directly with specific LLM model
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId,
        articleVersionId,
        language: 'en',
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model,
      },
    })

    const id = toGlobalId({
      type: NODE_TYPES.ArticleVersion,
      id: articleVersionId,
    })
    const server = await testClient({ connections })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_VERSION_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: {
          language: 'en',
          model,
        },
      },
    })

    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(LLM_TRANSLATION)
    expect(data.node.translation.content).toBe(LLM_TRANSLATION)
    expect(data.node.translation.model).toBe(model)
  })

  test('query new article version', async () => {
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

    // Create translation record for the new version with valid model
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId,
        articleVersionId: newArticleVersion.id,
        language: 'en',
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model: 'google_gemini_2_0_flash_001',
      },
    })

    // Create translation record directly with specific LLM model
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId,
        articleVersionId: newArticleVersion.id,
        language: 'en',
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model: 'google_gemini_2_5_flash_preview',
      },
    })

    const server2 = await testClient({ connections })
    const id2 = toGlobalId({
      type: NODE_TYPES.ArticleVersion,
      id: newArticleVersion.id,
    })
    const { error: error2, data: data2 } = await server2.executeOperation({
      query: GET_ARTICLE_VERSION_TRANSLATION,
      variables: {
        nodeInput: { id: id2 },
        translationInput: {
          language: 'en',
          model: 'google_gemini_2_5_flash_preview',
        },
      },
    })

    expect(error2).toBeUndefined()
    expect(data2.node.translation.title).toBe(LLM_TRANSLATION)
    expect(data2.node.translation.content).toBe(LLM_TRANSLATION)
    expect(data2.node.translation.model).toBe('google_gemini_2_5_flash_preview')
  })

  test('query paywalled article version', async () => {
    const articleVersionId = '1'
    const authorId = '1'
    const model = 'google_gemini_2_5_flash_preview'

    const { articleId } = await atomService.findUnique({
      table: 'article_version',
      where: { id: articleVersionId },
    })

    // Create translation record
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId,
        articleVersionId,
        language: 'en',
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model,
      },
    })

    // Create paywall (circle)
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

    const id = toGlobalId({
      type: NODE_TYPES.ArticleVersion,
      id: articleVersionId,
    })

    // Query with non-member
    const server = await testClient({ connections })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_VERSION_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: 'en', model },
      },
    })

    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(LLM_TRANSLATION)
    expect(data.node.translation.content).toBe('')
    expect(data.node.translation.model).toBe(model)

    // Query with author
    const server2 = await testClient({
      connections,
      userId: authorId,
    })
    const { error: error2, data: data2 } = await server2.executeOperation({
      query: GET_ARTICLE_VERSION_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: 'en', model },
      },
    })

    expect(error2).toBeUndefined()
    expect(data2.node.translation.title).toBe(LLM_TRANSLATION)
    expect(data2.node.translation.content).toBe(LLM_TRANSLATION)
    expect(data2.node.translation.model).toBe(model)
  })
})
