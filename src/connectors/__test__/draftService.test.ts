import type { Connections } from 'definitions'

import { DraftService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let draftService: DraftService

beforeAll(async () => {
  connections = await genConnections()
  draftService = new DraftService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('countByAuthor', async () => {
  const count = await draftService.countByAuthor('1')
  expect(count).toBeDefined()
})

test('findUnpublishedByAuthor', async () => {
  const drafts = await draftService.findUnpublishedByAuthor('1')
  expect(drafts[0]).toBeDefined()
})
