import { DraftService } from '../draftService'

const draftValidation = {
  id: expect.any(String),
  uuid: expect.any(String),
  authorId: expect.any(String),
  upstreamId: null,
  title: expect.any(String),
  cover: null,
  abstract: expect.any(String),
  content: expect.any(String),
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date)
}

const audioValidation = {
  id: expect.any(String),
  uuid: expect.any(String),
  authorId: expect.any(String),
  title: expect.any(String),
  audio: expect.any(String),
  length: expect.any(Number),
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date)
}

const service = new DraftService()

test('countByAuthor', async () => {
  const count = await service.countByAuthor('1')
  expect(count).toBe(1)
})

test('findByAuthor', async () => {
  const drafts = await service.findByAuthor('1')
  expect(drafts.length).toBe(1)
  expect(drafts[0]).toEqual(expect.objectContaining(draftValidation))
})

test('findByAuthorInBatch', async () => {
  const drafts = await service.findByAuthorInBatch('1', 0)
  expect(drafts.length).toBe(1)
  expect(drafts[0]).toEqual(expect.objectContaining(draftValidation))
})

test('findAudioDraft', async () => {
  const audios = await service.findAudioDraft('1')
  expect(audios.length).toBe(1)
  expect(audios[0]).toEqual(expect.objectContaining(audioValidation))
})

test('findAudioDraftsByAuthor', async () => {
  const audios = await service.findAudioDraftsByAuthor('1', 0)
  expect(audios.length).toBe(1)
  expect(audios[0]).toEqual(expect.objectContaining(audioValidation))
})
