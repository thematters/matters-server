import { DraftService } from 'connectors'

const service = new DraftService()

test('countByAuthor', async () => {
  const count = await service.countByAuthor('1')
  expect(count).toBeDefined()
})

test('findUnpublishedByAuthor', async () => {
  const drafts = await service.findUnpublishedByAuthor('1')
  expect(drafts[0]).toBeDefined()
})
