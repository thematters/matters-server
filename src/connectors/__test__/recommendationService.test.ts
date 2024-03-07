import type { Connections } from 'definitions'

import { RecommendationService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
// let atomService: AtomService
let recommendationService: RecommendationService

beforeAll(async () => {
  connections = await genConnections()
  // atomService = new AtomService(connections)
  recommendationService = new RecommendationService(connections)
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('IcymiTopic', () => {
  const title = 'test title'
  const pinAmount = 3
  const articles = ['1', '2']
  const note = 'test note'
  describe('createIcymiTopic', () => {
    test('pin amount is check', () => {
      expect(
        recommendationService.createIcymiTopic({
          title,
          articles,
          pinAmount: 42,
          note,
        })
      ).rejects.toThrowError('Invalid pin amount')
    })
    test('articles is check', () => {
      expect(
        recommendationService.createIcymiTopic({
          title,
          articles,
          pinAmount,
          note,
        })
      ).rejects.toThrowError('Invalid pin amount')
    })
  })
})
