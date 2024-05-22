import type { Connections } from 'definitions'

import {
  MATTERS_CHOICE_TOPIC_STATE,
  MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS,
} from 'common/enums'
import { RecommendationService, AtomService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let atomService: AtomService
let recommendationService: RecommendationService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  recommendationService = new RecommendationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const title = 'test title'
const pinAmount = MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS[0]
const articleIds = ['1', '2', '3']
const note = 'test note'

describe('IcymiTopic', () => {
  describe('createIcymiTopic', () => {
    test('pin amount is checked', () => {
      expect(
        recommendationService.createIcymiTopic({
          title,
          articleIds,
          pinAmount: 42,
          note,
        })
      ).rejects.toThrowError('Invalid pin amount')
    })
    test('articles are checked', () => {
      expect(
        recommendationService.createIcymiTopic({
          title,
          articleIds: ['0'],
          pinAmount,
          note,
        })
      ).rejects.toThrowError('Invalid article')
    })
    test('create topic', async () => {
      const topicNoNote = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
      })
      expect(topicNoNote.title).toBe(title)
      expect(topicNoNote.articles).toEqual(articleIds)
      expect(topicNoNote.pinAmount).toBe(pinAmount)
      expect(topicNoNote.note).toBe(null)
      expect(topicNoNote.state).toBe(MATTERS_CHOICE_TOPIC_STATE.editing)
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      expect(topic.note).toBe(note)
    })
  })
  describe('updateIcymiTopic', () => {
    test('topic is checked', async () => {
      expect(
        recommendationService.updateIcymiTopic('0', {
          title,
        })
      ).rejects.toThrowError('Topic not found')
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      await atomService.update({
        table: 'matters_choice_topic',
        where: { id: topic.id },
        data: { state: MATTERS_CHOICE_TOPIC_STATE.archived },
      })
      expect(
        recommendationService.updateIcymiTopic(topic.id, {
          title,
        })
      ).rejects.toThrowError('Invalid topic state')
    })
  })

  describe('publishIcymiTopic', () => {
    test('topic is checked', async () => {
      expect(recommendationService.publishIcymiTopic('0')).rejects.toThrowError(
        'Topic not found'
      )
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds: ['1', '2'],
        pinAmount,
        note,
      })
      expect(topic.state).toBe(MATTERS_CHOICE_TOPIC_STATE.editing)

      // articles amount should more than or equal to pinAmount
      expect(
        recommendationService.publishIcymiTopic(topic.id)
      ).rejects.toThrowError('Articles amount less than pinAmount')

      await recommendationService.updateIcymiTopic(topic.id, {
        articleIds,
      })
      const published = await recommendationService.publishIcymiTopic(topic.id)
      expect(published.state).toBe(MATTERS_CHOICE_TOPIC_STATE.published)

      expect(
        recommendationService.publishIcymiTopic(topic.id)
      ).rejects.toThrowError('Invalid topic state')
    })
    test('archive other published topics when published', async () => {
      const topic1 = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      await recommendationService.publishIcymiTopic(topic1.id)

      const topic2 = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      const published = await recommendationService.publishIcymiTopic(topic2.id)
      expect(published.state).toBe(MATTERS_CHOICE_TOPIC_STATE.published)
      expect(published.publishedAt).not.toBeNull()

      const topic1AfterPublish = await atomService.findUnique({
        table: 'matters_choice_topic',
        where: { id: topic1.id },
      })
      expect(topic1AfterPublish.state).toBe(MATTERS_CHOICE_TOPIC_STATE.archived)
    })
  })
  describe('archiveIcymiTopic', () => {
    test('delete editing topic', async () => {
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      expect(topic.state).toBe(MATTERS_CHOICE_TOPIC_STATE.editing)
      await recommendationService.archiveIcymiTopic(topic.id)
      const topicAfterArchive = await atomService.findUnique({
        table: 'matters_choice_topic',
        where: { id: topic.id },
      })
      expect(topicAfterArchive).toBeUndefined()
    })
    test('archive published topic', async () => {
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
        note,
      })
      await recommendationService.publishIcymiTopic(topic.id)
      const archived = await recommendationService.archiveIcymiTopic(topic.id)
      expect(archived?.state).toBe(MATTERS_CHOICE_TOPIC_STATE.archived)
    })
    test('update articles in archived topic to icymi articles', async () => {
      await atomService.deleteMany({ table: 'matters_choice' })
      const topic = await recommendationService.createIcymiTopic({
        title,
        articleIds,
        pinAmount,
      })
      await recommendationService.publishIcymiTopic(topic.id)
      await recommendationService.archiveIcymiTopic(topic.id)
      const icymis = await atomService.findMany({
        table: 'matters_choice',
        orderBy: [{ column: 'updatedAt', order: 'desc' }],
      })
      expect(icymis.map(({ articleId }) => articleId)).toEqual(articleIds)

      const topic2 = await recommendationService.createIcymiTopic({
        title,
        articleIds: [...articleIds].reverse(),
        pinAmount,
      })
      await recommendationService.publishIcymiTopic(topic2.id)
      await recommendationService.archiveIcymiTopic(topic2.id)
      const icymis2 = await atomService.findMany({
        table: 'matters_choice',
        orderBy: [{ column: 'updatedAt', order: 'desc' }],
      })
      expect(icymis2.map(({ articleId }) => articleId)).toEqual(
        [...articleIds].reverse()
      )
    })
  })
})

describe('find icymi articles', () => {
  beforeEach(async () => {
    await atomService.deleteMany({ table: 'matters_choice' })
  })
  test('find nothing', async () => {
    const [articles, totalCount] =
      await recommendationService.findIcymiArticles({})
    expect(articles).toHaveLength(0)
    expect(totalCount).toBe(0)
  })
  test('find articles', async () => {
    const topic = await recommendationService.createIcymiTopic({
      title,
      articleIds,
      pinAmount,
    })
    await recommendationService.publishIcymiTopic(topic.id)
    await recommendationService.archiveIcymiTopic(topic.id)
    const [articles, totalCount] =
      await recommendationService.findIcymiArticles({})
    expect(articles).toHaveLength(3)
    expect(totalCount).toBe(3)

    const topic2 = await recommendationService.createIcymiTopic({
      title,
      articleIds,
      pinAmount,
    })
    await recommendationService.publishIcymiTopic(topic2.id)
    // articles in published topic are not included
    const [articles2, totalCount2] =
      await recommendationService.findIcymiArticles({})
    expect(articles2).toHaveLength(0)
    expect(totalCount2).toBe(0)
  })
})
