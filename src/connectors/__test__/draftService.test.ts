import { DraftService } from '../draftService'

const service = new DraftService()

test('countByAuthor', async () => {
  const count = await service.countByAuthor('1')
  expect(count).toBe(1)
})

test('findByAuthor', async () => {
  const drafts = await service.findByAuthor('1')
  expect(drafts.length).toBe(1)

  // TODO: Add object property validation
})

test('findByAuthorInBatch', async () => {
  const drafts = await service.findByAuthorInBatch('1', 0)
  expect(drafts.length).toBe(1)

  // TODO: Add object property validation
})

test('findAudioDraft', async () => {
  const audios = await service.findAudioDraft('1')
  expect(audios.length).toBe(1)

  // TODO: Add object property validation
})

test('findAudioDraftsByAuthor', async () => {
  const audios = await service.findAudioDraftsByAuthor('1')
  expect(audios.length).toBe(1)

  // TODO: Add object property validation
})

test('findAudioDraftsByAuthorInBatch', async () => {
  const audios = await service.findAudioDraftsByAuthorInBatch('1', 0)
  expect(audios.length).toBe(1)

  // TODO: Add object property validation
})
