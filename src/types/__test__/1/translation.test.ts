import type { Connections } from '#definitions/index.js'

import { LANGUAGE, NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { AtomService, ArticleService, OpenRouter } from '#connectors/index.js'

import { testClient, genConnections, closeConnections } from '../utils.js'

let connections: Connections
let atomService: AtomService
let articleService: ArticleService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  articleService = new ArticleService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const GOOGLE_TRANSLATION = 'Google translated text'
const LLM_TRANSLATION = 'LLM translated text'
const TEXT_TC = '漢字'
const TEXT_SC = '汉字'

const createArticleWithLanguage = async (
  title: string,
  content: string,
  language: keyof typeof LANGUAGE
) => {
  const [article] = await articleService.createArticle({
    title,
    content,
    authorId: '1',
  })
  const articleVersion = await articleService.loadLatestArticleVersion(
    article.id
  )
  await atomService.update({
    table: 'article_version',
    where: { id: articleVersion.id },
    data: { language },
  })
  return { article, articleVersion }
}

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

  test('non-admin can query article translations', async () => {
    const model = 'google_gemini_2_0_flash'
    const originalLanguage = LANGUAGE.zh_hans
    const targetLanguage = LANGUAGE.en

    const { article, articleVersion } = await createArticleWithLanguage(
      TEXT_SC,
      TEXT_SC,
      originalLanguage
    )

    // Create translation records directly
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId: article.id,
        articleVersionId: articleVersion.id,
        language: targetLanguage,
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model,
      },
    })

    const id = toGlobalId({ type: NODE_TYPES.Article, id: article.id })
    const server = await testClient({ connections })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: targetLanguage },
      },
    })

    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(LLM_TRANSLATION)
    expect(data.node.translation.content).toBe(LLM_TRANSLATION)
    expect(data.node.translation.model).toBe(model)
  })

  test('non-admin cannot query article translations with model', async () => {
    const model = 'google_gemini_2_0_flash'
    const { article, articleVersion } = await createArticleWithLanguage(
      TEXT_SC,
      TEXT_SC,
      LANGUAGE.zh_hans
    )

    // Create translation records directly
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId: article.id,
        articleVersionId: articleVersion.id,
        language: LANGUAGE.en,
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model,
      },
    })

    const id = toGlobalId({ type: NODE_TYPES.Article, id: article.id })
    const server = await testClient({ connections })

    const { errors } = await server.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: LANGUAGE.en, model },
      },
    })
    expect(errors).toBeDefined()
    expect(errors[0].extensions.code).toBe('BAD_USER_INPUT')
  })

  test('admin can query article translations with specific LLM model', async () => {
    const { article, articleVersion } = await createArticleWithLanguage(
      TEXT_SC,
      TEXT_SC,
      LANGUAGE.zh_hans
    )

    // Create translation records directly with LLM model
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId: article.id,
        articleVersionId: articleVersion.id,
        language: LANGUAGE.en,
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model: 'google_gemini_2_0_flash',
      },
    })
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId: article.id,
        articleVersionId: articleVersion.id,
        language: LANGUAGE.en,
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model: 'google_gemini_2_5_flash',
      },
    })

    const id = toGlobalId({ type: NODE_TYPES.Article, id: article.id })
    const server = await testClient({ connections, isAdmin: true })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: {
          language: LANGUAGE.en,
          model: 'google_gemini_2_5_flash',
        },
      },
    })

    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(LLM_TRANSLATION)
    expect(data.node.translation.content).toBe(LLM_TRANSLATION)
    expect(data.node.translation.model).toBe('google_gemini_2_5_flash')
  })

  test('can query zh_hans article in zh_hant with OpenCC', async () => {
    const model = 'opencc'
    const originalLanguage = LANGUAGE.zh_hans
    const targetLanguage = LANGUAGE.zh_hant

    const { article } = await createArticleWithLanguage(
      TEXT_SC,
      TEXT_SC,
      originalLanguage
    )

    const id = toGlobalId({ type: NODE_TYPES.Article, id: article.id })
    const server = await testClient({ connections, isAdmin: true })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: {
          language: targetLanguage,
          model,
        },
      },
    })

    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(TEXT_TC)
    expect(data.node.translation.content).toBe(TEXT_TC)
    expect(data.node.translation.model).toBe(model)
  })

  test('can query zh_hant article in zh_hans with OpenCC', async () => {
    const model = 'opencc'
    const originalLanguage = LANGUAGE.zh_hant
    const targetLanguage = LANGUAGE.zh_hans

    const { article } = await createArticleWithLanguage(
      TEXT_TC,
      TEXT_TC,
      originalLanguage
    )

    const id = toGlobalId({ type: NODE_TYPES.Article, id: article.id })
    const server = await testClient({ connections, isAdmin: true })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: {
          language: targetLanguage,
          model,
        },
      },
    })

    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(TEXT_SC)
    expect(data.node.translation.content).toBe(TEXT_SC)
    expect(data.node.translation.model).toBe(model)
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
    const { article, articleVersion } = await createArticleWithLanguage(
      TEXT_SC,
      TEXT_SC,
      LANGUAGE.zh_hans
    )
    const openRouter = new OpenRouter()
    const model = openRouter.toDatabaseModel(openRouter.defaultModel)

    // Create translation record directly with default model
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId: article.id,
        articleVersionId: articleVersion.id,
        language: LANGUAGE.en,
        title: GOOGLE_TRANSLATION,
        content: GOOGLE_TRANSLATION,
        model,
      },
    })

    const id = toGlobalId({
      type: NODE_TYPES.ArticleVersion,
      id: articleVersion.id,
    })
    const server = await testClient({ connections })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_VERSION_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: LANGUAGE.en },
      },
    })

    expect(error).toBeUndefined()
    expect(data.node.translation.title).toBe(GOOGLE_TRANSLATION)
    expect(data.node.translation.content).toBe(GOOGLE_TRANSLATION)
    expect(data.node.translation.model).toBe(model)
  })

  test('query translations with specific LLM model', async () => {
    const model = 'google_gemini_2_0_flash'
    const { article, articleVersion } = await createArticleWithLanguage(
      TEXT_SC,
      TEXT_SC,
      LANGUAGE.zh_hans
    )

    // Create translation record directly with specific LLM model
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId: article.id,
        articleVersionId: articleVersion.id,
        language: LANGUAGE.en,
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model,
      },
    })

    const id = toGlobalId({
      type: NODE_TYPES.ArticleVersion,
      id: articleVersion.id,
    })
    const server = await testClient({ connections, isAdmin: true })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_VERSION_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: {
          language: LANGUAGE.en,
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
    const { article } = await createArticleWithLanguage(
      TEXT_SC,
      TEXT_SC,
      LANGUAGE.zh_hans
    )
    const newArticleVersion = await articleService.createNewArticleVersion(
      article.id,
      article.authorId,
      { title: 'new title', content: 'new content' }
    )

    // Create translation record for the new version with valid model
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId: article.id,
        articleVersionId: newArticleVersion.id,
        language: LANGUAGE.en,
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model: 'google_gemini_2_0_flash',
      },
    })

    // Create translation record directly with specific LLM model
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId: article.id,
        articleVersionId: newArticleVersion.id,
        language: LANGUAGE.en,
        title: LLM_TRANSLATION,
        content: LLM_TRANSLATION,
        model: 'google_gemini_2_5_flash',
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
          language: LANGUAGE.en,
        },
      },
    })

    expect(error2).toBeUndefined()
    expect(data2.node.translation.title).toBe(LLM_TRANSLATION)
    expect(data2.node.translation.content).toBe(LLM_TRANSLATION)
    expect(data2.node.translation.model).toBe('google_gemini_2_0_flash')
  })

  test('query paywalled article version', async () => {
    const model = 'google_gemini_2_0_flash'
    const authorId = '1'
    const { article, articleVersion } = await createArticleWithLanguage(
      TEXT_SC,
      TEXT_SC,
      LANGUAGE.zh_hans
    )

    // Create translation record
    await atomService.create({
      table: 'article_translation',
      data: {
        articleId: article.id,
        articleVersionId: articleVersion.id,
        language: LANGUAGE.en,
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
      data: { articleId: article.id, circleId: circle.id },
    })

    const id = toGlobalId({
      type: NODE_TYPES.ArticleVersion,
      id: articleVersion.id,
    })

    // Query with non-member
    const server = await testClient({ connections })
    const { error, data } = await server.executeOperation({
      query: GET_ARTICLE_VERSION_TRANSLATION,
      variables: {
        nodeInput: { id },
        translationInput: { language: LANGUAGE.en },
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
        translationInput: { language: LANGUAGE.en },
      },
    })

    expect(error2).toBeUndefined()
    expect(data2.node.translation.title).toBe(LLM_TRANSLATION)
    expect(data2.node.translation.content).toBe(LLM_TRANSLATION)
    expect(data2.node.translation.model).toBe(model)
  })
})
