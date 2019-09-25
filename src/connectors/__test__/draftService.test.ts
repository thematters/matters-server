import { draftService } from '../draftService'

const draftValidation = {
  id: expect.any(String),
  uuid: expect.any(String),
  authorId: expect.any(String),
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

test('countByAuthor', async () => {
  const count = await draftService.countByAuthor('1')
  expect(count).toBeDefined()
})

test('findByAuthor', async () => {
  const drafts = await draftService.findByAuthor('1')
  expect(drafts[0]).toBeDefined()
})

test.skip('findAudiodraft', async () => {
  const audios = await draftService.findAudiodraft('1')
  expect(audios.length).toBe(1)
  expect(audios[0]).toEqual(expect.objectContaining(audioValidation))
})

test.skip('findAudiodraftsByAuthor', async () => {
  const audios = await draftService.findAudiodraftsByAuthor('1')
  expect(audios[0]).toEqual(expect.objectContaining(audioValidation))
})
