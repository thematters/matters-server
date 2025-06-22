import type { Connections } from '#definitions/index.js'

import { jest } from '@jest/globals'

import {
  NOTICE_TYPE,
  PUBLISH_STATE,
  ARTICLE_STATE,
  CAMPAIGN_STATE,
} from '#common/enums/index.js'
import {
  AtomService,
  ArticleService,
  PublicationService,
  NotificationService,
  CampaignService,
} from '#connectors/index.js'

import { genConnections, closeConnections } from '../utils.js'

let connections: Connections
let atomService: AtomService
let articleService: ArticleService
let publicationService: PublicationService
let campaignService: CampaignService
let notificationService: NotificationService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  articleService = new ArticleService(connections)
  publicationService = new PublicationService(connections)
  campaignService = new CampaignService(connections)
  notificationService = new NotificationService(connections)
  // @ts-ignore
  articleService.notificationService = notificationService
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('publishArticle', () => {
  test('should not publish if draft does not exist', async () => {
    const result = await publicationService.publishArticle('0')
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

    const result = await publicationService.publishArticle(draft.id)
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

    const result = await publicationService.publishArticle(draft.id)

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

    const result = await publicationService.publishArticle(draft.id)

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

  test('should handle failed article connections and notify correctly', async () => {
    // Create a draft with connections to non-existent and inactive articles
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Draft with Failed Connections',
        content: 'Test content',
        publishState: PUBLISH_STATE.pending,
        publishAt: new Date(),
        connections: ['0', '1'],
      },
    })

    // Create an inactive article
    const inactiveArticle = await atomService.update({
      table: 'article',
      where: { id: '1' },
      data: {
        state: ARTICLE_STATE.archived,
      },
    })

    // Mock notification trigger
    const triggerSpy = jest.spyOn(notificationService, 'trigger')

    const result = await publicationService.publishArticle(draft.id)

    // Verify article was created
    expect(result).toBeDefined()

    // Verify notification was triggered with correct entity types
    const article = await atomService.findFirst({
      table: 'article',
      where: { id: result?.articleId },
    })

    expect(triggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NOTICE_TYPE.scheduled_article_published,
        recipientId: '1',
        entities: expect.arrayContaining([
          { type: 'target', entityTable: 'article', entity: article },
          {
            type: 'connection',
            entityTable: 'article',
            entity: inactiveArticle,
          },
        ]),
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

    const result = await publicationService.publishArticle(draft.id)

    // Verify article was created
    expect(result).toBeDefined()

    const articleTags = await atomService.findMany({
      table: 'article_tag',
      where: { articleId: result?.articleId },
    })
    expect(articleTags).toHaveLength(2)
  })

  test('should handle collections when publishing', async () => {
    // Create collections first
    const collection1 = await atomService.create({
      table: 'collection',
      data: {
        title: 'Test Collection 1',
        authorId: '1',
      },
    })
    const collection2 = await atomService.create({
      table: 'collection',
      data: {
        title: 'Test Collection 2',
        authorId: '1',
      },
    })

    // Create a draft with collections
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Draft with Collections',
        content: 'Test content',
        publishState: PUBLISH_STATE.pending,
        collections: [collection1.id, collection2.id],
      },
    })

    const result = await publicationService.publishArticle(draft.id)

    // Verify article was created
    expect(result).toBeDefined()

    // Verify article was added to collections
    const articleCollections = await atomService.findMany({
      table: 'collection_article',
      where: { articleId: result?.articleId },
    })
    expect(articleCollections).toHaveLength(2)
  })

  test('should handle failed collections and notify correctly for scheduled articles', async () => {
    // Create a invalid collection ID
    const collection = await atomService.create({
      table: 'collection',
      data: {
        title: 'Test Collection 1',
        authorId: '2',
      },
    })

    // Create a draft with a non-existent collection
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Draft with Failed Collection',
        content: 'Test content',
        publishState: PUBLISH_STATE.pending,
        publishAt: new Date(),
        collections: [collection.id],
      },
    })

    // Mock notification trigger
    const triggerSpy = jest.spyOn(notificationService, 'trigger')

    const result = await publicationService.publishArticle(draft.id)

    // Verify article was created
    expect(result).toBeDefined()

    // Verify notification was triggered for collection failure
    const article = await atomService.findFirst({
      table: 'article',
      where: { id: result?.articleId },
    })

    expect(triggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: NOTICE_TYPE.scheduled_article_published,
        recipientId: '1',
        entities: expect.arrayContaining([
          { type: 'target', entityTable: 'article', entity: article },
          {
            type: 'collection' as const,
            entityTable: 'collection' as const,
            entity: collection,
          },
        ]),
      })
    )
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
        publishAt: new Date(),
      },
    })

    // Mock notification trigger
    const triggerSpy = jest.spyOn(notificationService, 'trigger')

    const result = await publicationService.publishArticle(draft.id)

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

  test('should handle campaigns when publishing', async () => {
    const campaignData = {
      name: 'test',
      applicationPeriod: [
        new Date('2010-01-01 11:30'),
        new Date('2010-01-01 15:00'),
      ] as const,
      writingPeriod: [
        new Date('2010-01-01 11:30'),
        new Date('2010-01-05 15:00'),
      ] as const,
      creatorId: '1',
    }
    const activeCampaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    const archivedCampaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    await campaignService.apply(activeCampaign, {
      id: '1',
      userName: 'test',
      state: 'active',
    })
    await campaignService.apply(archivedCampaign, {
      id: '1',
      userName: 'test',
      state: 'active',
    })
    await atomService.update({
      table: 'campaign',
      where: { id: archivedCampaign.id },
      data: {
        state: CAMPAIGN_STATE.archived,
      },
    })

    // Create a draft with campaigns
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'Test Draft with Campaigns',
        content: 'Test content',
        publishAt: new Date(),
        publishState: PUBLISH_STATE.pending,
        campaigns: JSON.stringify([
          { campaign: activeCampaign.id },
          { campaign: archivedCampaign.id },
        ]),
      },
    })

    const triggerSpy = jest.spyOn(notificationService, 'trigger')
    const result = await publicationService.publishArticle(draft.id)

    // Verify article was created
    expect(result.articleId).toBeDefined()

    // Verify article was submitted to campaigns
    const campaignArticles = await atomService.findMany({
      table: 'campaign_article',
      where: { articleId: result.articleId },
    })
    expect(campaignArticles).toHaveLength(1)

    const article = await atomService.findFirst({
      table: 'article',
      where: { id: result?.articleId },
    })
    expect(triggerSpy).toHaveBeenCalledWith({
      event: NOTICE_TYPE.scheduled_article_published,
      recipientId: '1',
      entities: [
        { type: 'target', entityTable: 'article', entity: article },
        {
          type: 'campaign',
          entityTable: 'campaign',
          entity: { ...archivedCampaign, state: CAMPAIGN_STATE.archived },
        },
      ],
    })
  })
})
