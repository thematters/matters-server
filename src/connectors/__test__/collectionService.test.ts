import type { Connections } from 'definitions'

import { CollectionService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let collectionService: CollectionService
let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
  collectionService = new CollectionService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

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

  const { id: id1 } = await collectionService.createCollection({
    authorId: '2',
    title: 'test',
  })
  const { id: id2 } = await collectionService.createCollection({
    authorId: '2',
    title: 'test',
  })

  // order by `updated_at` desc

  const [records1, count1] =
    await collectionService.findAndCountCollectionsByUser('2', {
      skip: 0,
      take: 1,
    })

  expect(records1.length).toBe(1)
  expect(count1).toBe(2)
  expect(records1[0].id).toBe(id2)

  // update collections meta info will update `updated_at`

  await collectionService.updateCollection(id1, { title: 'new title' })

  const [records2] = await collectionService.findAndCountCollectionsByUser(
    '2',
    {
      skip: 0,
      take: 2,
    }
  )

  expect(records2[0].id).toBe(id1)
  expect(records2[1].id).toBe(id2)

  // add articles to collection will update `updated_at`

  await collectionService.addArticles(id2, ['2'])

  const [records3] = await collectionService.findAndCountCollectionsByUser(
    '2',
    {
      skip: 0,
      take: 2,
    }
  )

  expect(records3[0].id).toBe(id2)
  expect(records3[1].id).toBe(id1)
})

test('deleteCollections', async () => {
  const authorId = '3'
  const { id } = await collectionService.createCollection({
    authorId,
    title: 'test',
  })
  await expect(collectionService.deleteCollections([id], '1')).rejects.toThrow(
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

  // will not delete other collection's articles
  const { id: collectionId2 } = await collectionService.createCollection({
    authorId: '1',
    title: 'other collection',
  })
  await collectionService.addArticles(collectionId2, ['3'])
  await collectionService.deleteCollectionArticles(collectionId, ['3'])
  const res2 = await collectionService.findAndCountArticlesInCollection(
    collectionId2,
    { skip: 0, take: 10 }
  )
  expect(res2[1]).toBe(1)
  expect(res2[0][0].articleId).toBe('3')
})

test('loadByIds', async () => {
  const res = await collectionService.loadByIds([])
  expect(res.length).toBe(0)

  const { id: id1 } = await collectionService.createCollection({
    authorId: '1',
    title: 'test',
  })
  const { id: id2 } = await collectionService.createCollection({
    authorId: '1',
    title: 'test',
  })
  const res2 = await collectionService.loadByIds([id1, id2])
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
  await expect(
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

describe('reorderArticles', () => {
  let collectionId: string
  beforeEach(async () => {
    const { id } = await collectionService.createCollection({
      authorId: '1',
      title: 'test',
    })
    collectionId = id
    await collectionService.addArticles(collectionId, ['1', '2', '3', '4'])
  })
  test('invalid article ids will throw', async () => {
    await expect(
      collectionService.reorderArticles(collectionId, [
        { articleId: '5', newPosition: 2 },
      ])
    ).rejects.toThrow(/Invalid articleId/)
  })
  test('invalid newPosition will throw', async () => {
    await expect(
      collectionService.reorderArticles(collectionId, [
        { articleId: '1', newPosition: -1 },
      ])
    ).rejects.toThrow(/Invalid newPosition/)
    await expect(
      collectionService.reorderArticles(collectionId, [
        { articleId: '2', newPosition: 4 },
      ])
    ).rejects.toThrow(/Invalid newPosition/)
  })
  test('do nothing when move to same position', async () => {
    await collectionService.reorderArticles(collectionId, [
      { articleId: '4', newPosition: 0 },
    ])
    const [records] = await collectionService.findAndCountArticlesInCollection(
      collectionId,
      {
        skip: 0,
        take: 4,
      }
    )
    expect(records[0].articleId).toBe('4')
    expect(records[1].articleId).toBe('3')
    expect(records[2].articleId).toBe('2')
    expect(records[3].articleId).toBe('1')
  })
  test('move to first position', async () => {
    await collectionService.reorderArticles(collectionId, [
      { articleId: '2', newPosition: 0 },
    ])
    const [records] = await collectionService.findAndCountArticlesInCollection(
      collectionId,
      {
        skip: 0,
        take: 4,
      }
    )
    expect(records[0].articleId).toBe('2')
    expect(records[1].articleId).toBe('4')
    expect(records[2].articleId).toBe('3')
    expect(records[3].articleId).toBe('1')
  })
  test('move to last position', async () => {
    await collectionService.reorderArticles(collectionId, [
      { articleId: '3', newPosition: 3 },
    ])
    const [records] = await collectionService.findAndCountArticlesInCollection(
      collectionId,
      {
        skip: 0,
        take: 4,
      }
    )
    expect(records[0].articleId).toBe('4')
    expect(records[1].articleId).toBe('2')
    expect(records[2].articleId).toBe('1')
    expect(records[3].articleId).toBe('3')
  })
  test('move to middle position', async () => {
    await collectionService.reorderArticles(collectionId, [
      { articleId: '3', newPosition: 3 - 1 },
    ])
    const [records] = await collectionService.findAndCountArticlesInCollection(
      collectionId,
      {
        skip: 0,
        take: 4,
      }
    )
    expect(records[0].articleId).toBe('4')
    expect(records[1].articleId).toBe('2')
    expect(records[2].articleId).toBe('3')
    expect(records[3].articleId).toBe('1')

    await collectionService.reorderArticles(collectionId, [
      { articleId: '3', newPosition: 2 - 1 },
    ])
    const [records2] = await collectionService.findAndCountArticlesInCollection(
      collectionId,
      {
        skip: 0,
        take: 4,
      }
    )
    expect(records2[0].articleId).toBe('4')
    expect(records2[1].articleId).toBe('3')
    expect(records2[2].articleId).toBe('2')
    expect(records2[3].articleId).toBe('1')
  })
  test('move multiple articles', async () => {
    await collectionService.reorderArticles(collectionId, [
      { articleId: '1', newPosition: 0 },
      { articleId: '4', newPosition: 3 - 1 },
      { articleId: '2', newPosition: 4 - 1 },
      { articleId: '1', newPosition: 3 - 1 },
    ])
    const [records] = await collectionService.findAndCountArticlesInCollection(
      collectionId,
      {
        skip: 0,
        take: 4,
      }
    )
    expect(records[0].articleId).toBe('3')
    expect(records[1].articleId).toBe('4')
    expect(records[2].articleId).toBe('1')
    expect(records[3].articleId).toBe('2')
  })
})

describe('findPinnedByAuthor', () => {
  test('empty', async () => {
    const records = await collectionService.findPinnedByAuthor('1')
    expect(records.length).toBe(0)
  })
  test('success', async () => {
    const { id } = await collectionService.createCollection({
      authorId: '1',
      title: 'test',
    })
    await collectionService.updatePinned(id, '1', true)
    const records = await collectionService.findPinnedByAuthor('1')
    expect(records.length).toBe(1)
  })
})

test('updatePinned', async () => {
  const { id } = await collectionService.createCollection({
    authorId: '1',
    title: 'test',
  })
  expect((await collectionService.baseFindById(id)).pinned).toBe(false)
  const collection = await collectionService.updatePinned(id, '1', true)
  expect(collection.pinned).toBe(true)
  expect((await collectionService.baseFindById(id)).pinned).toBe(true)
})
