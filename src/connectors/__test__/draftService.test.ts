import { DraftService } from '../draftService'

const draftValidation = {
  id: expect.any(String),
  uuid: expect.any(String),
  authorId: expect.any(String),
  upstreamId: null,
  title: expect.any(String),
  cover: null,
  summary: expect.any(String),
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
  expect(count).toBeDefined()
})

test('findByAuthor', async () => {
  const drafts = await service.findByAuthor('1')
  expect(drafts[0]).toEqual(expect.objectContaining(draftValidation))
})

test('findAudiodraft', async () => {
  const audios = await service.findAudiodraft('1')
  expect(audios.length).toBe(1)
  expect(audios[0]).toEqual(expect.objectContaining(audioValidation))
})

test('findAudiodraftsByAuthor', async () => {
  const audios = await service.findAudiodraftsByAuthor('1', 0)
  expect(audios[0]).toEqual(expect.objectContaining(audioValidation))
})
