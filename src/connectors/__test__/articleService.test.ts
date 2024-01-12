import type { Connections } from 'definitions'

import { v4 } from 'uuid'

import { COMMENT_STATE, NODE_TYPES } from 'common/enums'
import { ArticleService, UserService, AtomService } from 'connectors'

import { genConnections, closeConnections, createArticle } from './utils'

let articleId: string
let connections: Connections
let articleService: ArticleService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  articleService = new ArticleService(connections)
  atomService = new AtomService(connections)
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

test('publish', async () => {
  // publish article to IPFS
  const publishedDraft = await articleService.draftLoader.load('1')
  const { mediaHash, contentHash: dataHash } =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (await articleService.publishToIPFS(publishedDraft))!
  const articlePublished = await articleService.createArticle({
    draftId: '1',
    authorId: '1',
    title: 'test',
    slug: 'test',
    cover: '1',
    wordCount: 0,
    summary: 'test-summary',
    content: '<div>test-html-string</div>',
    dataHash,
    mediaHash,
  })
  expect(mediaHash).toBeDefined()
  expect(dataHash).toBeDefined()
  expect(articlePublished.state).toBe('pending')

  articleId = articlePublished.id
  // publish to IPNS
  // await articleService.publishFeedToIPNS({ userName: 'test1' })
})

test('sumAppreciation', async () => {
  const appreciation = await articleService.sumAppreciation('1')
  expect(appreciation).toBeDefined()
})

describe('findByAuthor', () => {
  test('order by created_at', async () => {
    const draftIds = await articleService.findByAuthor('1')
    expect(draftIds.length).toBeDefined()
  })
  test('order by num of readers', async () => {
    const draftIds = await articleService.findByAuthor('1', {
      orderBy: 'mostReaders',
    })
    expect(draftIds.length).toBeDefined()
    expect(draftIds[0].draftId).not.toBe('1')
    await connections.knex('article_ga4_data').insert({
      articleId: '1',
      totalUsers: '1',
      dateRange: '[2023-10-24,2023-10-24]',
    })
    const draftIds2 = await articleService.findByAuthor('1', {
      orderBy: 'mostReaders',
    })
    expect(draftIds2[0].draftId).toBe('1')
  })
  test('order by amount of appreciations', async () => {
    const draftIds = await articleService.findByAuthor('1', {
      orderBy: 'mostAppreciations',
    })
    expect(draftIds.length).toBeDefined()
  })
  test('order by num of comments', async () => {
    const draftIds = await articleService.findByAuthor('1', {
      orderBy: 'mostComments',
    })
    expect(draftIds.length).toBeDefined()
  })
  test('order by num of donations', async () => {
    const draftIds = await articleService.findByAuthor('1', {
      orderBy: 'mostDonations',
    })
    expect(draftIds.length).toBeDefined()
  })
  test('filter by state', async () => {
    const draftIds = await articleService.findByAuthor('1', {
      state: 'archived',
    })
    expect(draftIds.length).toBeDefined()
  })
})

test('findByCommentedAuthor', async () => {
  const articles = await articleService.findByCommentedAuthor({ id: '1' })
  expect(articles.length).toBeDefined()
})
test('countAppreciations', async () => {
  expect(await articleService.countAppreciations('1')).toBe(3)
  expect(await articleService.countAppreciations('0')).toBe(0)
})

test('findAppreciations', async () => {
  const appreciations = await articleService.findAppreciations({
    referenceId: '1',
  })
  expect(appreciations.length).toBe(3)

  const appreciations2 = await articleService.findAppreciations({
    referenceId: '1',
    take: 1,
  })
  expect(appreciations2.length).toBe(1)
  expect(appreciations[0].totalCount).toBe('3')
})

test('findTagIds', async () => {
  const tagIds = await articleService.findTagIds({ id: '1' })
  expect(tagIds.length).toEqual(2)
})

test('findSubscriptions', async () => {
  const subs = await articleService.findSubscriptions({ id: '2' })
  expect(subs.length).toEqual(2)
})

describe('updatePinned', () => {
  const getArticleFromDb = async (id: string) => articleService.baseFindById(id)
  test('invaild article id will throw error', async () => {
    await expect(articleService.updatePinned('999', '1', true)).rejects.toThrow(
      'Cannot find article'
    )
  })
  test('not author user id will throw error', async () => {
    await expect(articleService.updatePinned('1', '999', true)).rejects.toThrow(
      'Only author can pin article'
    )
  })
  test('success', async () => {
    let article = await new ArticleService(connections).updatePinned(
      '1',
      '1',
      true
    )
    expect(article.pinned).toBe(true)
    expect((await getArticleFromDb('1')).pinned).toBe(true)
    article = await new ArticleService(connections).updatePinned('1', '1', true)
    expect(article.pinned).toBe(true)
    expect((await getArticleFromDb('1')).pinned).toBe(true)
  })
  test('cannot toggle more than 3 works', async () => {
    await articleService.updatePinned('4', '1', true)
    await articleService.updatePinned('6', '1', true)

    const userService = new UserService(connections)
    const total = await userService.totalPinnedWorks('1')
    expect(total).toBe(3)
    await expect(
      articleService.updatePinned(articleId, '1', true)
    ).rejects.toThrow()
  })
})

test('update', async () => {
  const article = await articleService.baseUpdate('1', {
    state: 'archived',
  })
  expect(article.state).toEqual('archived')
})

describe('quicksearch', () => {
  test('search by title', async () => {
    const { nodes, totalCount } = await articleService.searchV3({
      key: 'test',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes.length).toBe(1)
    expect(totalCount).toBeGreaterThan(0)

    // both case insensitive and chinese simplified/traditional insensitive
    await createArticle(
      { title: 'Uppercase', content: '', authorId: '1' },
      connections
    )
    const { nodes: nodes2 } = await articleService.searchV3({
      key: 'uppercase',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes2.length).toBe(1)

    await createArticle(
      { title: '測試', content: '', authorId: '1' },
      connections
    )
    const { nodes: nodes3 } = await articleService.searchV3({
      key: '测试',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes3.length).toBe(1)

    await createArticle(
      { title: '试测', content: '', authorId: '1' },
      connections
    )
    const { nodes: nodes4 } = await articleService.searchV3({
      key: '試測',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes4.length).toBe(1)

    await createArticle(
      { title: '測测', content: '', authorId: '1' },
      connections
    )
    const { nodes: nodes5 } = await articleService.searchV3({
      key: '測测',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes5.length).toBe(1)

    // mixed case will not match in current implementation
    const { nodes: nodes6 } = await articleService.searchV3({
      key: '测測',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes6.length).toBe(0)
  })
  test('filter by authorId', async () => {
    const { nodes } = await articleService.searchV3({
      key: 'test',
      take: 10,
      skip: 0,
      quicksearch: true,
      filter: { authorId: '2' },
    })
    console.log(nodes)
    nodes.forEach((node) => {
      expect(node.authorId).toBe('2')
    })
  })
})

test('countReaders', async () => {
  const count1 = await articleService.countReaders('1')
  expect(count1).toBeDefined()
  // count not exist articles' readers
  const count0 = await articleService.countReaders('0')
  expect(count0).toBe(0)
})

test('latestArticles', async () => {
  const articles = await articleService.latestArticles({
    maxTake: 500,
    skip: 0,
    take: 10,
    oss: false,
  })
  expect(articles.length).toBeGreaterThan(0)
})

describe('findResponses', () => {
  const createComment = async (
    state?: keyof typeof COMMENT_STATE,
    parentCommentId?: string
  ) => {
    return atomService.create({
      table: 'comment',
      data: {
        uuid: v4(),
        content: 'test',
        authorId: '1',
        targetId: '1',
        targetTypeId: '4',
        type: 'article',
        parentCommentId,
        state: state ?? COMMENT_STATE.active,
      },
    })
  }
  test('do not return archived comment not having any not-archived child comments', async () => {
    const res1 = await articleService.findResponses({ id: '1' })
    expect(res1.length).toBeGreaterThan(0)

    // active comment will be returned
    await createComment()
    const res2 = await articleService.findResponses({ id: '1' })
    expect(res2.length).toBe(res1.length + 1)

    // archived comment will not be returned
    const archived = await createComment(COMMENT_STATE.archived)
    const res3 = await articleService.findResponses({ id: '1' })
    expect(res3.length).toBe(res2.length)

    // archived comment w/o active/collapsed child comments will not be returned
    await createComment(COMMENT_STATE.archived, archived.id)
    await createComment(COMMENT_STATE.banned, archived.id)
    const res4 = await articleService.findResponses({ id: '1' })
    expect(res4.length).toBe(res3.length)

    // archived comment w active/collapsed child comments will be returned
    await createComment(COMMENT_STATE.active, archived.id)
    const res5 = await articleService.findResponses({ id: '1' })
    expect(res5.length).toBe(res4.length + 1)

    // banned comment will not be returned
    const banned = await createComment(COMMENT_STATE.archived)
    const res6 = await articleService.findResponses({ id: '1' })
    expect(res6.length).toBe(res5.length)

    // banned comment w/o active/collapsed child comments will not be returned
    await createComment(COMMENT_STATE.archived, banned.id)
    await createComment(COMMENT_STATE.banned, banned.id)
    const res7 = await articleService.findResponses({ id: '1' })
    expect(res7.length).toBe(res6.length)

    // banned comment w active/collapsed child comments will be returned
    await createComment(COMMENT_STATE.collapsed, banned.id)
    const res8 = await articleService.findResponses({ id: '1' })
    expect(res8.length).toBe(res7.length + 1)
  })
  test('count is right', async () => {
    const res = await articleService.findResponses({ id: '1' })
    expect(+res[0].totalCount).toBe(res.length)

    const res1 = await articleService.findResponses({ id: '1', first: 1 })
    expect(+res1[0].totalCount).toBe(res.length)
  })

  test('cursor works', async () => {
    const res = await articleService.findResponses({ id: '1' })
    const res1 = await articleService.findResponses({
      id: '1',
      after: { type: NODE_TYPES.Comment, id: res[0].entityId },
    })
    expect(res1.length).toBe(res.length - 1)
    expect(+res1[0].totalCount).toBe(res.length)
  })
})
