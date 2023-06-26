import { CollectionService } from 'connectors'

const collectionService = new CollectionService()

test('createCollection', async () => {
  await collectionService.createCollection({
    authorId: '1',
    title: 'test',
    description: 'test',
  })
  expect(await collectionService.baseCount()).toBe(1)
})

test('updateCollection', async () => {
  const { id } = await collectionService.createCollection({
    authorId: '1',
    title: 'origin title',
    description: 'origin description',
  })
  await collectionService.updateCollection(id, { title: 'new title' })
  expect((await collectionService.baseFindById(id)).title).toBe('new title')
  await collectionService.updateCollection(id, {
    description: 'new description',
  })
  expect((await collectionService.baseFindById(id)).description).toBe(
    'new description'
  )
})

test('findAndCountCollectionsByUser', async () => {
  const [records0, count0] =
    await collectionService.findAndCountCollectionsByUser('2', {
      skip: 0,
      take: 10,
    })

  expect(records0.length).toBe(0)
  expect(count0).toBe(0)

  await collectionService.createCollection({
    authorId: '2',
    title: 'test',
  })
  await collectionService.createCollection({
    authorId: '2',
    title: 'test',
  })

  const [records1, count1] =
    await collectionService.findAndCountCollectionsByUser('2', {
      skip: 0,
      take: 1,
    })

  expect(records1.length).toBe(1)
  expect(count1).toBe(2)
})

test('deleteCollections', async () => {
  const authorId = '3'
  const { id } = await collectionService.createCollection({
    authorId,
    title: 'test',
  })
  const result = await collectionService.deleteCollections([id], '1')
  expect(result).toBe(false)

  const result2 = await collectionService.deleteCollections([], authorId)
  expect(result2).toBe(false)

  const result3 = await collectionService.deleteCollections([id], authorId)
  expect(result3).toBe(true)
})
