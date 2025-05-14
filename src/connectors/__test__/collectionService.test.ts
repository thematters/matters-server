import type { Connections, Article } from '#definitions/index.js'
import {
  CollectionService,
  AtomService,
  ArticleService,
  UserService,
} from '#connectors/index.js'
import { USER_STATE } from '#common/enums/index.js'
import { ForbiddenByStateError, ForbiddenError } from '#common/errors.js'

import { genConnections, closeConnections } from './utils.js'

let collectionService: CollectionService
let atomService: AtomService
let articleService: ArticleService
let userService: UserService
let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
  collectionService = new CollectionService(connections)
  userService = new UserService(connections)
  atomService = new AtomService(connections)
  articleService = new ArticleService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('collection', () => {
  const authorId = '1'
  let articles: Article[]
  beforeAll(async () => {
    for (let i = 0; i < 5; i++) {
      await articleService.createArticle({
        authorId,
        title: `test ${i}`,
        content: `test ${i}`,
      })
    }
    articles = await atomService.findMany({
      table: 'article',
      where: { authorId },
    })
  })
  beforeEach(async () => {
    await atomService.deleteMany({ table: 'action_collection' })
    await atomService.deleteMany({ table: 'collection_article' })
    await atomService.deleteMany({ table: 'collection' })
  })
  test('createCollection', async () => {
    await collectionService.createCollection({
      authorId,
      title: 'test',
      description: 'test',
    })
    expect(await atomService.count({ table: 'collection' })).toBe(1)
  })

  test('updateCollection', async () => {
    const { id } = await collectionService.createCollection({
      authorId,
      title: 'origin title',
      description: 'origin description',
    })
    await collectionService.updateCollection(id, { title: 'new title' })
    expect(
      (await atomService.findUnique({ table: 'collection', where: { id } }))
        .title
    ).toBe('new title')
    await collectionService.updateCollection(id, {
      description: 'new description',
    })
    expect(
      (await atomService.findUnique({ table: 'collection', where: { id } }))
        .description
    ).toBe('new description')
  })

  test('findAndCountCollectionsByUser', async () => {
    const [records0, count0] =
      await collectionService.findAndCountCollectionsByUser(authorId, {
        skip: 0,
        take: 10,
      })

    expect(records0.length).toBe(0)
    expect(count0).toBe(0)

    const { id: id1 } = await collectionService.createCollection({
      authorId,
      title: 'test',
    })
    const { id: id2 } = await collectionService.createCollection({
      authorId,
      title: 'test',
    })

    // order by `updated_at` desc

    const [records1, count1] =
      await collectionService.findAndCountCollectionsByUser(authorId, {
        skip: 0,
        take: 1,
      })

    expect(records1.length).toBe(1)
    expect(count1).toBe(2)
    expect(records1[0].id).toBe(id2)

    // update collections meta info will update `updated_at`

    await collectionService.updateCollection(id1, { title: 'new title' })

    const [records2] = await collectionService.findAndCountCollectionsByUser(
      authorId,
      {
        skip: 0,
        take: 2,
      }
    )

    expect(records2[0].id).toBe(id1)
    expect(records2[1].id).toBe(id2)

    // add articles to collection will update `updated_at`

    await collectionService.addArticles({
      collectionId: id2,
      articleIds: articles.slice(0, 2).map((a) => a.id),
      user: { id: authorId },
    })

    const [records3] = await collectionService.findAndCountCollectionsByUser(
      authorId,
      {
        skip: 0,
        take: 2,
      }
    )

    expect(records3[0].id).toBe(id2)
    expect(records3[1].id).toBe(id1)
  })

  test('deleteCollections', async () => {
    const { id } = await collectionService.createCollection({
      authorId,
      title: 'test',
    })
    await expect(
      collectionService.deleteCollections([id], '2')
    ).rejects.toThrow('Author id not match')

    const result = await collectionService.deleteCollections([], authorId)
    expect(result).toBe(false)

    const result2 = await collectionService.deleteCollections([id], authorId)
    expect(result2).toBe(true)

    // delete collection with articles
    const { id: id1 } = await collectionService.createCollection({
      authorId,
      title: 'test',
    })
    await collectionService.addArticles({
      collectionId: id1,
      articleIds: articles.slice(0, 2).map((a) => a.id),
      user: { id: authorId },
    })
    const result3 = await collectionService.deleteCollections([id1], authorId)
    expect(result3).toBe(true)
  })

  test('deleteCollectionArticles', async () => {
    const { id: collectionId } = await collectionService.createCollection({
      authorId: '1',
      title: 'test',
    })
    await collectionService.addArticles({
      collectionId,
      articleIds: articles.slice(0, 2).map((a) => a.id),
      user: { id: authorId },
    })
    await collectionService.deleteCollectionArticles(
      collectionId,
      articles.slice(0, 1).map((a) => a.id)
    )
    const res = await collectionService.findAndCountArticlesInCollection(
      collectionId,
      { skip: 0, take: 10 }
    )
    expect(res[1]).toBe(1)
    expect(res[0][0].id).toBe(articles[1].id)

    // will not delete other collection's articles
    const { id: collectionId2 } = await collectionService.createCollection({
      authorId,
      title: 'other collection',
    })
    await collectionService.addArticles({
      collectionId: collectionId2,
      articleIds: articles.slice(2, 3).map((a) => a.id),
      user: { id: authorId },
    })
    await collectionService.deleteCollectionArticles(
      collectionId,
      articles.slice(2, 3).map((a) => a.id)
    )
    const res2 = await collectionService.findAndCountArticlesInCollection(
      collectionId2,
      { skip: 0, take: 10 }
    )
    expect(res2[1]).toBe(1)
    expect(res2[0][0].id).toBe(articles[2].id)
  })

  test('loadByIds', async () => {
    const res = await atomService.collectionIdLoader.loadMany([])
    expect(res.length).toBe(0)

    const { id: id1 } = await collectionService.createCollection({
      authorId,
      title: 'test',
    })
    const { id: id2 } = await collectionService.createCollection({
      authorId,
      title: 'test',
    })
    const res2 = await atomService.collectionIdLoader.loadMany([id1, id2])
    expect(res2.length).toBe(2)
    expect(res2[0].id).toBe(id1)
    expect(res2[1].id).toBe(id2)
  })

  test('addArticles', async () => {
    const { id: collectionId } = await collectionService.createCollection({
      authorId,
      title: 'test',
    })
    // insert articles first time
    await collectionService.addArticles({
      collectionId,
      articleIds: articles.slice(0, 2).map((a) => a.id),
      user: { id: authorId },
    })

    // insert same articles again - should skip duplicates instead of throwing error
    await collectionService.addArticles({
      collectionId,
      articleIds: articles.slice(0, 2).map((a) => a.id),
      user: { id: authorId },
    })

    // insert different articles
    await collectionService.addArticles({
      collectionId,
      articleIds: articles.slice(2, 4).map((a) => a.id),
      user: { id: authorId },
    })

    const [records, count] =
      await collectionService.findAndCountArticlesInCollection(collectionId, {
        skip: 0,
        take: 4,
      })

    expect(count).toBe(4)
    // order by insert time desc
    expect(records[0].id).toBe(articles[3].id)
    expect(records[1].id).toBe(articles[2].id)
    expect(records[2].id).toBe(articles[1].id)
    expect(records[3].id).toBe(articles[0].id)
  })

  describe('reorderArticles', () => {
    let collectionId: string
    let articleIds: string[]
    beforeEach(async () => {
      // reset collection and articles before each test
      const { id } = await collectionService.createCollection({
        authorId,
        title: 'test',
      })
      collectionId = id
      articleIds = articles.slice(0, 4).map((a) => a.id)
      await collectionService.addArticles({
        collectionId,
        articleIds,
        user: { id: authorId },
      })
    })
    test('invalid article ids will throw', async () => {
      await expect(
        collectionService.reorderArticles(collectionId, [
          { articleId: '0', newPosition: 2 },
        ])
      ).rejects.toThrow(/Invalid articleId/)
    })
    test('invalid newPosition will throw', async () => {
      const articleId = articleIds[0]
      await expect(
        collectionService.reorderArticles(collectionId, [
          { articleId, newPosition: -1 },
        ])
      ).rejects.toThrow(/Invalid newPosition/)
      await expect(
        collectionService.reorderArticles(collectionId, [
          { articleId, newPosition: 4 },
        ])
      ).rejects.toThrow(/Invalid newPosition/)
    })
    test('do nothing when move to same position', async () => {
      const articleId = articleIds[3]
      await collectionService.reorderArticles(collectionId, [
        { articleId, newPosition: 0 },
      ])
      const [records] =
        await collectionService.findAndCountArticlesInCollection(collectionId, {
          skip: 0,
          take: 4,
        })
      expect(records[0].id).toBe(articleIds[3])
      expect(records[1].id).toBe(articleIds[2])
      expect(records[2].id).toBe(articleIds[1])
      expect(records[3].id).toBe(articleIds[0])
    })
    test('move to first position', async () => {
      await collectionService.reorderArticles(collectionId, [
        { articleId: articleIds[1], newPosition: 0 },
      ])
      const [records] =
        await collectionService.findAndCountArticlesInCollection(collectionId, {
          skip: 0,
          take: 4,
        })
      expect(records[0].id).toBe(articleIds[1])
      expect(records[1].id).toBe(articleIds[3])
      expect(records[2].id).toBe(articleIds[2])
      expect(records[3].id).toBe(articleIds[0])
    })
    test('move to last position', async () => {
      await collectionService.reorderArticles(collectionId, [
        { articleId: articleIds[2], newPosition: 3 },
      ])
      const [records] =
        await collectionService.findAndCountArticlesInCollection(collectionId, {
          skip: 0,
          take: 4,
        })
      expect(records[0].id).toBe(articleIds[3])
      expect(records[1].id).toBe(articleIds[1])
      expect(records[2].id).toBe(articleIds[0])
      expect(records[3].id).toBe(articleIds[2])
    })
    test('move to middle position', async () => {
      await collectionService.reorderArticles(collectionId, [
        { articleId: articleIds[3], newPosition: 2 },
      ])
      const [records] =
        await collectionService.findAndCountArticlesInCollection(collectionId, {
          skip: 0,
          take: 4,
        })
      expect(records[0].id).toBe(articleIds[2])
      expect(records[1].id).toBe(articleIds[1])
      expect(records[2].id).toBe(articleIds[3])
      expect(records[3].id).toBe(articleIds[0])

      await collectionService.reorderArticles(collectionId, [
        { articleId: articleIds[2], newPosition: 1 },
      ])
      const [records2] =
        await collectionService.findAndCountArticlesInCollection(collectionId, {
          skip: 0,
          take: 4,
        })
      expect(records2[0].id).toBe(articleIds[1])
      expect(records2[1].id).toBe(articleIds[2])
      expect(records2[2].id).toBe(articleIds[3])
      expect(records2[3].id).toBe(articleIds[0])
    })
    test('move multiple articles', async () => {
      await collectionService.reorderArticles(collectionId, [
        { articleId: articleIds[0], newPosition: 0 },
        { articleId: articleIds[1], newPosition: 2 },
        { articleId: articleIds[2], newPosition: 3 },
        { articleId: articleIds[3], newPosition: 2 },
      ])
      const [records] =
        await collectionService.findAndCountArticlesInCollection(collectionId, {
          skip: 0,
          take: 4,
        })
      expect(records[0].id).toBe(articleIds[0])
      expect(records[1].id).toBe(articleIds[1])
      expect(records[2].id).toBe(articleIds[3])
      expect(records[3].id).toBe(articleIds[2])
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

  describe('findByAuthor', () => {
    test('empty', async () => {
      const records = await collectionService.findByAuthor('3')
      expect(records.length).toBe(0)
    })
    test('success', async () => {
      await collectionService.createCollection({
        authorId: '3',
        title: 'test',
      })
      const records = await collectionService.findByAuthor('3')
      expect(records.length).toBe(1)

      await collectionService.createCollection({
        authorId: '3',
        title: 'test2',
      })

      const records2 = await collectionService.findByAuthor('3', { take: 1 })
      expect(records2.length).toBe(1)
    })
    test('filter empty collections', async () => {
      const records1 = await collectionService.findByAuthor(
        authorId,
        { take: 1 },
        true
      )
      expect(records1.length).toBe(0)

      const collection = await collectionService.createCollection({
        authorId,
        title: 'test3',
      })
      await collectionService.addArticles({
        collectionId: collection.id,
        articleIds: articles.slice(0, 1).map((a) => a.id),
        user: { id: authorId },
      })
      const records2 = await collectionService.findByAuthor(
        authorId,
        { take: 1 },
        true
      )
      expect(records2.length).toBe(1)
    })
  })

  test('updatePinned', async () => {
    const { id } = await collectionService.createCollection({
      authorId: '1',
      title: 'test',
    })
    expect(
      (await atomService.findUnique({ table: 'collection', where: { id } }))
        .pinned
    ).toBe(false)
    const collection = await collectionService.updatePinned(id, '1', true)
    expect(collection.pinned).toBe(true)
    expect(
      (await atomService.findUnique({ table: 'collection', where: { id } }))
        .pinned
    ).toBe(true)
  })

  describe('like/unklike collections', () => {
    test('not active user will fail', async () => {
      const user = { id: '1', state: USER_STATE.banned }
      const collection = await collectionService.createCollection({
        authorId: '2',
        title: 'test',
        description: 'test',
      })
      expect(collectionService.like(collection.id, user)).rejects.toThrowError(
        ForbiddenByStateError
      )
    })
    test('success', async () => {
      const user = { id: '1', state: USER_STATE.active }
      const collection = await collectionService.createCollection({
        authorId: '2',
        title: 'test',
        description: 'test',
      })
      expect(collectionService.isLiked(collection.id, user.id)).resolves.toBe(
        false
      )
      await collectionService.like(collection.id, user)
      expect(collectionService.isLiked(collection.id, user.id)).resolves.toBe(
        true
      )

      // like multiple times is idempotent
      await collectionService.like(collection.id, user)
      expect(collectionService.isLiked(collection.id, user.id)).resolves.toBe(
        true
      )

      // unlike multiple times is idempotent
      await collectionService.unlike(collection.id, user)
      expect(collectionService.isLiked(collection.id, user.id)).resolves.toBe(
        false
      )
      await collectionService.unlike(collection.id, user)
      expect(collectionService.isLiked(collection.id, user.id)).resolves.toBe(
        false
      )
    })
    test('author can like own collection', async () => {
      const user = { id: '1', state: USER_STATE.active }
      const collection = await collectionService.createCollection({
        authorId: '1',
        title: 'test',
        description: 'test',
      })
      await collectionService.like(collection.id, user)
    })
    test('count likes', async () => {
      const collection = await collectionService.createCollection({
        authorId: '2',
        title: 'test',
        description: 'test',
      })
      expect(collectionService.countLikes(collection.id)).resolves.toBe(0)
      await collectionService.like(collection.id, {
        id: '2',
        state: USER_STATE.active,
      })
      await collectionService.like(collection.id, {
        id: '2',
        state: USER_STATE.active,
      })
      expect(collectionService.countLikes(collection.id)).resolves.toBe(1)
    })
    test('blocked user will fail', async () => {
      const user = { id: '3', state: USER_STATE.active }
      const author = { id: '4', state: USER_STATE.active, userName: 'testuser' }
      const collection = await collectionService.createCollection({
        authorId: author.id,
        title: 'test',
        description: 'test',
      })
      await userService.block(author.id, user.id)
      await expect(
        collectionService.like(collection.id, user)
      ).rejects.toThrowError(ForbiddenError)
    })
  })
})
