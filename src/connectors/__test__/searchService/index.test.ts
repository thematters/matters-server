import type { Connections } from '#definitions/index.js'

import {
  SearchService,
  AtomService,
  ArticleService,
} from '#connectors/index.js'
import { USER_STATE } from '#common/enums/index.js'

import { genConnections, closeConnections } from '../utils.js'

let connections: Connections
let searchService: SearchService
let atomService: AtomService
let articleService: ArticleService

beforeAll(async () => {
  connections = await genConnections()
  searchService = new SearchService(connections)
  atomService = new AtomService(connections)
  articleService = new ArticleService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

beforeEach(async () => {
  // Clean up search index before each test
  await connections.knexSearch('search_index.user').del()
})

describe('indexUsers', () => {
  test('handles empty userIds array', async () => {
    await expect(searchService.indexUsers([])).resolves.not.toThrow()
  })

  test('deduplicates userIds', async () => {
    const userIds = ['1', '1', '1'] // Duplicate IDs
    await searchService.indexUsers(userIds)

    // Verify only one record was created
    const indexedUsers = await connections
      .knexSearch('search_index.user')
      .where({ id: '1' })
      .select('*')
    expect(indexedUsers).toHaveLength(1)
  })

  test('indexes user data with follower counts', async () => {
    // Use seed data users
    const user1Id = '1' // Matty
    const user2Id = '2' // Test User

    await searchService.indexUsers([user1Id, user2Id])

    // Verify indexed data
    const indexedUser1 = await connections
      .knexSearch('search_index.user')
      .where({ id: user1Id })
      .first()

    expect(indexedUser1).toBeDefined()
    expect(indexedUser1.state).toBe(USER_STATE.active)
    // from db/seeds/11_action_user.js
    expect(indexedUser1.numFollowers).toBe(2)

    const indexedUser2 = await connections
      .knexSearch('search_index.user')
      .where({ id: user2Id })
      .first()

    expect(indexedUser2).toBeDefined()
    // from db/seeds/11_action_user.js
    expect(indexedUser2.numFollowers).toBe(2)
  })

  test('updates existing indexed user data', async () => {
    const userId = '2' // Test User

    // First index
    await searchService.indexUsers([userId])

    // Update user data
    await atomService.update({
      table: 'user',
      where: { id: userId },
      data: {
        displayName: 'Updated User',
        description: 'Updated description',
      },
    })

    // Re-index
    await searchService.indexUsers([userId])

    // Verify updated data
    const indexedUser = await connections
      .knexSearch('search_index.user')
      .where({ id: userId })
      .first()

    expect(indexedUser).toBeDefined()
    expect(indexedUser.displayName).toBe('updated user') // Lowercase
    expect(indexedUser.description).toBe('updated description') // Lowercase
  })
})

describe('indexTags', () => {
  beforeEach(async () => {
    // Clean up search index before each test
    await connections.knexSearch('search_index.tag').del()
  })

  test('handles empty tagIds array', async () => {
    await expect(searchService.indexTags([])).resolves.not.toThrow()
  })

  test('deduplicates tagIds', async () => {
    const tagIds = ['1', '1', '1'] // Duplicate IDs
    await searchService.indexTags(tagIds)

    // Verify only one record was created
    const indexedTags = await connections
      .knexSearch('search_index.tag')
      .where({ id: '1' })
      .select('*')
    expect(indexedTags).toHaveLength(1)
  })

  test('indexes tag data with follower and article counts', async () => {
    // Use seed data tags
    const tag1Id = '1' // From seeds
    const tag2Id = '2' // From seeds

    await searchService.indexTags([tag1Id, tag2Id])

    // Verify indexed data
    const indexedTag1 = await connections
      .knexSearch('search_index.tag')
      .where({ id: tag1Id })
      .first()

    expect(indexedTag1).toBeDefined()
    expect(indexedTag1.content).toBeDefined()
    expect(indexedTag1.numFollowers).toBeDefined()
    expect(indexedTag1.numArticles).toBeDefined()
    expect(indexedTag1.numAuthors).toBeDefined()

    const indexedTag2 = await connections
      .knexSearch('search_index.tag')
      .where({ id: tag2Id })
      .first()

    expect(indexedTag2).toBeDefined()
    expect(indexedTag2.content).toBeDefined()
    expect(indexedTag2.numFollowers).toBeDefined()
    expect(indexedTag2.numArticles).toBeDefined()
    expect(indexedTag2.numAuthors).toBeDefined()
  })

  test('updates existing indexed tag data', async () => {
    const tagId = '2' // From seeds

    // First index
    await searchService.indexTags([tagId])

    // Update tag data
    await atomService.update({
      table: 'tag',
      where: { id: tagId },
      data: {
        content: 'Updated Tag',
        description: 'Updated description',
      },
    })

    // Re-index
    await searchService.indexTags([tagId])

    // Verify updated data
    const indexedTag = await connections
      .knexSearch('search_index.tag')
      .where({ id: tagId })
      .first()

    expect(indexedTag).toBeDefined()
    expect(indexedTag.content).toBe('updated tag') // Lowercase and simplified Chinese
    expect(indexedTag.description).toBe('updated description') // Lowercase and simplified Chinese
  })
})

describe('indexArticles', () => {
  beforeEach(async () => {
    // Clean up search index before each test
    await connections.knexSearch('search_index.article').del()
  })

  test('handles empty articleIds array', async () => {
    await expect(searchService.indexArticles([])).resolves.not.toThrow()
  })

  test('deduplicates articleIds', async () => {
    const articleIds = ['1', '1', '1'] // Duplicate IDs
    await searchService.indexArticles(articleIds)

    // Verify only one record was created
    const indexedArticles = await connections
      .knexSearch('search_index.article')
      .where({ id: '1' })
      .select('*')
    expect(indexedArticles).toHaveLength(1)
  })

  test('indexes article data with views and content', async () => {
    // Use seed data articles
    const article1Id = '1' // From seeds
    const article2Id = '2' // From seeds

    await searchService.indexArticles([article1Id, article2Id])

    // Verify indexed data
    const indexedArticle1 = await connections
      .knexSearch('search_index.article')
      .where({ id: article1Id })
      .first()

    expect(indexedArticle1).toBeDefined()
    expect(indexedArticle1.title).toBeDefined()
    expect(indexedArticle1.titleOrig).toBeDefined()
    expect(indexedArticle1.summary).toBeDefined()
    expect(indexedArticle1.textContentConverted).toBeDefined()
    expect(indexedArticle1.authorId).toBeDefined()
    expect(indexedArticle1.state).toBeDefined()
    expect(indexedArticle1.authorState).toBeDefined()
    expect(indexedArticle1.createdAt).toBeDefined()
    expect(indexedArticle1.indexedAt).toBeDefined()

    const indexedArticle2 = await connections
      .knexSearch('search_index.article')
      .where({ id: article2Id })
      .first()

    expect(indexedArticle2).toBeDefined()
    expect(indexedArticle2.title).toBeDefined()
    expect(indexedArticle2.titleOrig).toBeDefined()
    expect(indexedArticle2.summary).toBeDefined()
    expect(indexedArticle2.textContentConverted).toBeDefined()
    expect(indexedArticle2.authorId).toBeDefined()
    expect(indexedArticle2.state).toBeDefined()
    expect(indexedArticle2.authorState).toBeDefined()
    expect(indexedArticle2.createdAt).toBeDefined()
    expect(indexedArticle2.indexedAt).toBeDefined()
  })

  test('updates existing indexed article data', async () => {
    const articleId = '2' // From seeds

    // First index
    await searchService.indexArticles([articleId])

    // Update article data through a new version
    const updatedTitle = 'Updated title'
    const updatedSummary = 'Updated summary'
    const updatedContent = 'Updated content'
    await articleService.createNewArticleVersion(articleId, '1', {
      title: updatedTitle,
      summary: updatedSummary,
      content: `<p>${updatedContent}</p>`,
    })

    // Re-index
    await searchService.indexArticles([articleId])

    // Verify updated data
    const indexedArticle = await connections
      .knexSearch('search_index.article')
      .where({ id: articleId })
      .first()

    expect(indexedArticle).toBeDefined()
    expect(indexedArticle.title).toBe(updatedTitle.toLowerCase())
    expect(indexedArticle.summary).toBe(updatedSummary.toLowerCase())
    expect(indexedArticle.textContentConverted).toBe(
      updatedContent.toLowerCase()
    )
  })
})
