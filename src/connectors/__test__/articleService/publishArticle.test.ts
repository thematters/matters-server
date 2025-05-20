import type { Connections } from '#definitions/index.js'

import { jest } from '@jest/globals'

import { NOTICE_TYPE, PUBLISH_STATE } from '#common/enums/index.js'
import {
  AtomService,
  ArticleService,
  NotificationService,
} from '#connectors/index.js'

import { genConnections, closeConnections } from '../utils.js'

let connections: Connections
let atomService: AtomService
let articleService: ArticleService
let notificationService: NotificationService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  articleService = new ArticleService(connections)
  notificationService = new NotificationService(connections)
  // @ts-ignore
  articleService.notificationService = notificationService
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('publishArticle', () => {
  test('should not publish if draft does not exist', async () => {
    const result = await articleService.publishArticle('0')
    expect(result).toBeUndefined()
  })

  test('should not publish if draft is not in pending state', async () => {
    // Create a draft in unpublished state
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Draft',
        content: 'Test content',
        publishState: PUBLISH_STATE.unpublished,
      },
    })

    const result = await articleService.publishArticle(draft.id)
    expect(result.publishState).toBe(PUBLISH_STATE.unpublished)
  })

  test('should publish draft and create article', async () => {
    // Create a draft in pending state
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Draft',
        content: 'Test content',
        publishState: PUBLISH_STATE.pending,
      },
    })

    // Mock notification trigger
    const triggerSpy = jest.spyOn(notificationService, 'trigger')

    const result = await articleService.publishArticle(draft.id)

    expect(result).toBeDefined()
    expect(result?.publishState).toBe(PUBLISH_STATE.published)

    // Verify notification was triggered
    const article = await atomService.findFirst({
      table: 'article',
      where: { id: result?.articleId },
    })
    expect(triggerSpy).toHaveBeenCalledWith({
      event: NOTICE_TYPE.article_published,
      recipientId: '1',
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
    })
  })

  test('should handle connections when publishing', async () => {
    // Create a draft with connections
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Draft with Connections',
        content: 'Test content',
        publishState: PUBLISH_STATE.pending,
        connections: ['2', '3'], // IDs of existing articles
      },
    })

    // Mock notification trigger
    const triggerSpy = jest.spyOn(notificationService, 'trigger')

    const result = await articleService.publishArticle(draft.id)

    // Verify article was created
    expect(result).toBeDefined()

    // Verify connections were created
    const connections = await atomService.findMany({
      table: 'article_connection',
      where: { entranceId: result?.articleId },
      orderBy: [{ column: 'order', order: 'asc' }],
    })
    expect(connections).toHaveLength(2)
    expect(connections[0].articleId).toBe('2')
    expect(connections[1].articleId).toBe('3')

    // Verify notifications were triggered for connections
    expect(triggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NOTICE_TYPE.article_new_collected,
        recipientId: '2',
      })
    )
    expect(triggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NOTICE_TYPE.article_new_collected,
        recipientId: '3',
      })
    )
  })

  test('should handle tags when publishing', async () => {
    // Create a draft with tags
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Draft with Tags',
        content: 'Test content',
        publishState: PUBLISH_STATE.pending,
        tags: ['tag1', 'tag2'],
      },
    })

    const result = await articleService.publishArticle(draft.id)

    // Verify article was created
    expect(result).toBeDefined()

    const articleTags = await atomService.findMany({
      table: 'article_tag',
      where: { articleId: result?.articleId },
    })
    expect(articleTags).toHaveLength(2)
  })

  test('should handle scheduled publishing', async () => {
    // Create a draft in pending state
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Scheduled Draft',
        content: 'Test content',
        publishState: PUBLISH_STATE.pending,
      },
    })

    // Mock notification trigger
    const triggerSpy = jest.spyOn(notificationService, 'trigger')

    const result = await articleService.publishArticle(draft.id, true)

    // Verify article was created
    expect(result).toBeDefined()

    // Verify scheduled notification was triggered
    const article = await atomService.findFirst({
      table: 'article',
      where: { id: result?.articleId },
    })
    expect(triggerSpy).toHaveBeenCalledWith({
      event: NOTICE_TYPE.scheduled_article_published,
      recipientId: '1',
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
    })
  })
})
