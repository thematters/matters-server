import type { Connections } from '#definitions/index.js'

import { FEATURE_NAME, FEATURE_FLAG } from '#common/enums/index.js'
import {
  PublicationService,
  AtomService,
  SystemService,
} from '#connectors/index.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections
let publicationService: PublicationService
let atomService: AtomService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  publicationService = new PublicationService(connections)
  atomService = new AtomService(connections)
  systemService = new SystemService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const GET_ARTICLE_LANGUAGE = /* GraphQL */ `
  query GetArticleLanguage($shortHash: String!) {
    article(input: { shortHash: $shortHash }) {
      id
      language
    }
  }
`

describe('article language resolver', () => {
  test('skips language detection for spam articles', async () => {
    // Create article marked as spam by admin
    const [{ id: articleId, shortHash }] =
      await publicationService.createArticle({
        title: 'Spam Article',
        content: 'This is a spam article content',
        authorId: '1',
      })
    await atomService.update({
      table: 'article',
      where: { id: articleId },
      data: { isSpam: true },
    })

    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: GET_ARTICLE_LANGUAGE,
      variables: { shortHash },
    })

    expect(errors).toBeUndefined()
    expect(data?.article?.language).toBeNull()
  })

  test('skips language detection for articles with high spam score', async () => {
    // Set spam threshold
    const spamThreshold = 0.7
    await systemService.setFeatureFlag({
      name: FEATURE_NAME.spam_detection,
      flag: FEATURE_FLAG.on,
      value: spamThreshold,
    })

    // Create article with high spam score
    const [{ id: articleId, shortHash }] =
      await publicationService.createArticle({
        title: 'High Spam Score Article',
        content: 'This is an article with high spam score content',
        authorId: '1',
      })
    await atomService.update({
      table: 'article',
      where: { id: articleId },
      data: { spamScore: spamThreshold + 0.1 },
    })

    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: GET_ARTICLE_LANGUAGE,
      variables: { shortHash },
    })

    expect(errors).toBeUndefined()
    expect(data?.article?.language).toBeNull()
  })
})
