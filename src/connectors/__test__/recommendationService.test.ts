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

describe('IcymiTopic', () => {
  const title = 'test title'
  const pinAmount = MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS[0]
  const articleIds = ['1', '2']
  const note = 'test note'
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
})
