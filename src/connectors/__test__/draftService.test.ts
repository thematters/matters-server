import { DraftService } from 'connectors'

import { genConnections } from './utils'

let draftService: DraftService

beforeAll(async () => {
  draftService = new DraftService(await genConnections())
})

test('countByAuthor', async () => {
  const count = await draftService.countByAuthor('1')
  expect(count).toBeDefined()
})

test('findUnpublishedByAuthor', async () => {
  const drafts = await draftService.findUnpublishedByAuthor('1')
  expect(drafts[0]).toBeDefined()
})
