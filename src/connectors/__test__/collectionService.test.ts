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
  expect(collectionService.deleteCollections([id], '1')).rejects.toThrow(
    'Author id not match'
  )

  const result = await collectionService.deleteCollections([], authorId)
  expect(result).toBe(false)

  const result2 = await collectionService.deleteCollections([id], authorId)
  expect(result2).toBe(true)

  // delete collection with articles
  const { id: id1 } = await collectionService.createCollection({
    authorId,
    title: 'test',
  })
  await collectionService.addArticles(id1, ['1', '2'])
  const result3 = await collectionService.deleteCollections([id1], authorId)
  expect(result3).toBe(true)
})

test('deleteCollectionArticles', async () => {
  const { id: collectionId } = await collectionService.createCollection({
    authorId: '1',
    title: 'test',
  })
  await collectionService.addArticles(collectionId, ['1', '2'])
  await collectionService.deleteCollectionArticles(collectionId, ['1'])
  const res = await collectionService.findAndCountArticlesInCollection(
    collectionId,
    { skip: 0, take: 10 }
  )
  expect(res[1]).toBe(1)
  expect(res[0][0].articleId).toBe('2')
})

test('findByIds', async () => {
  const res = await collectionService.findByIds([])
  expect(res.length).toBe(0)

  const { id: id1 } = await collectionService.createCollection({
    authorId: '1',
    title: 'test',
  })
  const { id: id2 } = await collectionService.createCollection({
    authorId: '1',
    title: 'test',
  })
  const res2 = await collectionService.findByIds([id1, id2])
  expect(res2.length).toBe(2)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((res2[0] as any).id).toBe(id1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect((res2[1] as any).id).toBe(id2)
})

test('addArticles', async () => {
  const { id: collectionId } = await collectionService.createCollection({
    authorId: '1',
    title: 'test',
  })
  // insert articles first time
  await collectionService.addArticles(collectionId, ['1', '2'])

  // insert same articles again
  expect(async () =>
    collectionService.addArticles(collectionId, ['1', '2'])
  ).rejects.toThrow(/violates unique constraint/)

  // insert different articles
  await collectionService.addArticles(collectionId, ['3', '4'])

  const res = await collectionService.findAndCountArticlesInCollection(
    collectionId,
    { skip: 0, take: 4 }
  )

  expect(res[1]).toBe(4)
  // order by insert time desc
  expect(res[0][0].articleId).toBe('4')
  expect(res[0][1].articleId).toBe('3')
  expect(res[0][2].articleId).toBe('2')
  expect(res[0][3].articleId).toBe('1')
})
