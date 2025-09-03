import type { Connections } from '#definitions/index.js'

import { genConnections, closeConnections } from './utils.js'
import { AtomService } from '#connectors/index.js'

let connections: Connections
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('ArticleTag pinned functionality', () => {
  beforeEach(async () => {
    // Clean up test data
    await atomService.deleteMany({ table: 'article_tag' })
  })

  test('creates article tag with pinned columns', async () => {
    // Create article tag with pinned fields
    const articleTag = await atomService.create({
      table: 'article_tag',
      data: {
        articleId: '1', // Using seed article
        tagId: '1', // Using seed tag
        pinned: true,
        pinnedAt: new Date(),
        selected: true,
      },
    })

    expect(articleTag.id).toBeDefined()
    expect(articleTag.articleId).toBe('1')
    expect(articleTag.tagId).toBe('1')
    expect(articleTag.pinned).toBe(true)
    expect(articleTag.pinnedAt).toBeInstanceOf(Date)
    expect(articleTag.selected).toBe(true)
    expect(articleTag.createdAt).toBeInstanceOf(Date)
    expect(articleTag.updatedAt).toBeInstanceOf(Date)
  })

  test('creates article tag with default pinned values', async () => {
    // Create article tag without pinned fields (should use defaults)
    const articleTag = await atomService.create({
      table: 'article_tag',
      data: {
        articleId: '2', // Using seed article
        tagId: '2', // Using seed tag
        selected: true,
      },
    })

    expect(articleTag.id).toBeDefined()
    expect(articleTag.articleId).toBe('2')
    expect(articleTag.tagId).toBe('2')
    expect(articleTag.pinned).toBe(false) // Default value
    expect(articleTag.pinnedAt).toBeNull() // Default value
    expect(articleTag.selected).toBe(true)
  })

  test('updates article tag pinned status', async () => {
    // Create unpinned article tag
    const articleTag = await atomService.create({
      table: 'article_tag',
      data: {
        articleId: '3',
        tagId: '3',
        pinned: false,
        pinnedAt: null,
        selected: true,
      },
    })

    expect(articleTag.pinned).toBe(false)
    expect(articleTag.pinnedAt).toBeNull()

    // Update to pinned
    const pinnedAt = new Date()
    const updatedArticleTag = await atomService.update({
      table: 'article_tag',
      where: { id: articleTag.id },
      data: {
        pinned: true,
        pinnedAt,
      },
    })

    expect(updatedArticleTag.pinned).toBe(true)
    expect(updatedArticleTag.pinnedAt).toEqual(pinnedAt)
    expect(updatedArticleTag.updatedAt.getTime()).toBeGreaterThan(
      articleTag.updatedAt.getTime()
    )
  })

  test('queries article tags by pinned status', async () => {
    // Create multiple article tags with different pinned status
    await Promise.all([
      atomService.create({
        table: 'article_tag',
        data: {
          articleId: '1',
          tagId: '1',
          pinned: true,
          pinnedAt: new Date(),
          selected: true,
        },
      }),
      atomService.create({
        table: 'article_tag',
        data: {
          articleId: '2',
          tagId: '2',
          pinned: false,
          pinnedAt: null,
          selected: true,
        },
      }),
      atomService.create({
        table: 'article_tag',
        data: {
          articleId: '3',
          tagId: '3',
          pinned: true,
          pinnedAt: new Date(),
          selected: true,
        },
      }),
    ])

    // Query pinned article tags
    const pinnedTags = await atomService.findMany({
      table: 'article_tag',
      where: { pinned: true },
    })

    expect(pinnedTags).toHaveLength(2)
    expect(pinnedTags.every((tag) => tag.pinned)).toBe(true)
    expect(pinnedTags.every((tag) => tag.pinnedAt)).toBeTruthy()

    // Query unpinned article tags
    const unpinnedTags = await atomService.findMany({
      table: 'article_tag',
      where: { pinned: false },
    })

    expect(unpinnedTags).toHaveLength(1)
    expect(unpinnedTags[0].pinned).toBe(false)
    expect(unpinnedTags[0].pinnedAt).toBeNull()
  })
})
