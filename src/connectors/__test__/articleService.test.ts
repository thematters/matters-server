import type { Connections, Article } from 'definitions'

import { v4 } from 'uuid'

import {
  COMMENT_STATE,
  NODE_TYPES,
  APPRECIATION_TYPES,
  ARTICLE_APPRECIATE_LIMIT,
} from 'common/enums'
import { ArticleService, UserService, AtomService } from 'connectors'

import { genConnections, closeConnections } from './utils'

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
  // const publishedDraft = await atomService.articleIdLoader.load('1')
  // const { mediaHash, contentHash: dataHash } =
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  // (await articleService.publishToIPFS(publishedDraft))!
  const [article] = await articleService.createArticle({
    authorId: '1',
    title: 'test',
    cover: '1',
    content: '<div>test-html-string</div>',
  })
  // expect(mediaHash).toBeDefined()
  // expect(dataHash).toBeDefined()
  expect(article.state).toBe('active')

  articleId = article.id
  // publish to IPNS
  // await articleService.publishFeedToIPNS({ userName: 'test1' })
})

test('sumAppreciation', async () => {
  const appreciation = await articleService.sumAppreciation('1')
  expect(appreciation).toBeDefined()
})

describe('appreciation', () => {
  test('bundle', async () => {
    const appreciation = await articleService.appreciate({
      articleId: '1',
      senderId: '4',
      amount: 1,
      recipientId: '1',
      type: APPRECIATION_TYPES.like,
    })
    expect(appreciation[0].amount).toBe(1)

    const bundled1 = await articleService.appreciate({
      articleId: '1',
      senderId: '4',
      amount: 1,
      recipientId: '1',
      type: APPRECIATION_TYPES.like,
    })
    expect(bundled1[0].amount).toBe(2)

    // can not appreciate more than limit
    const bundled2 = await articleService.appreciate({
      articleId: '1',
      senderId: '4',
      amount: ARTICLE_APPRECIATE_LIMIT + 1,
      recipientId: '1',
      type: APPRECIATION_TYPES.like,
    })
    expect(bundled2[0].amount).toBe(ARTICLE_APPRECIATE_LIMIT)
  })

  test('can not appreciate more than limit', async () => {
    const appreciation = await articleService.appreciate({
      articleId: '1',
      senderId: '5',
      amount: ARTICLE_APPRECIATE_LIMIT + 1,
      recipientId: '1',
      type: APPRECIATION_TYPES.like,
    })
    expect(appreciation[0].amount).toBe(ARTICLE_APPRECIATE_LIMIT)

    // can not appreciate more than limit when call concurrently
    const [appreciation1, appreciation2] = await Promise.all([
      articleService.appreciate({
        articleId: '1',
        senderId: '5',
        amount: ARTICLE_APPRECIATE_LIMIT - 1,
        recipientId: '1',
        type: APPRECIATION_TYPES.like,
      }),
      articleService.appreciate({
        articleId: '1',
        senderId: '5',
        amount: ARTICLE_APPRECIATE_LIMIT - 1,
        recipientId: '1',
        type: APPRECIATION_TYPES.like,
      }),
    ])
    expect(appreciation1[0]?.amount ?? appreciation2[0]?.ammount).toBe(
      ARTICLE_APPRECIATE_LIMIT
    )
  })
})

describe('findByAuthor', () => {
  test('order by created_at', async () => {
    const draftIds = await articleService.findByAuthor('1')
    expect(draftIds.length).toBeDefined()
  })
  test('order by num of readers', async () => {
    const articles = await articleService.findByAuthor('1', {
      orderBy: 'mostReaders',
    })
    expect(articles.length).toBeDefined()
    expect(articles[0].id).not.toBe('1')
    await connections.knex('article_ga4_data').insert({
      articleId: '1',
      totalUsers: '1',
      dateRange: '[2023-10-24,2023-10-24]',
    })
    const articles2 = await articleService.findByAuthor('1', {
      orderBy: 'mostReaders',
    })
    expect(articles2[0].id).toBe('1')
  })
  test('order by amount of appreciations', async () => {
    const articles = await articleService.findByAuthor('1', {
      orderBy: 'mostAppreciations',
    })
    expect(articles.length).toBeDefined()
  })
  test('order by num of comments', async () => {
    const articles = await articleService.findByAuthor('1', {
      orderBy: 'mostComments',
    })
    expect(articles.length).toBeDefined()
  })
  test('order by num of donations', async () => {
    const articles = await articleService.findByAuthor('1', {
      orderBy: 'mostDonations',
    })
    expect(articles.length).toBeDefined()
  })
  test('filter by state', async () => {
    const articles = await articleService.findByAuthor('1', {
      state: 'archived',
    })
    expect(articles.length).toBeDefined()
  })
  test('excludeRestricted', async () => {
    const articles = await articleService.findByAuthor('1', {
      excludeRestricted: true,
    })
    expect(articles.length).toBeDefined()

    await atomService.create({
      table: 'article_recommend_setting',
      data: { articleId: articles[0].id, inNewest: true, inHottest: false },
    })
    const excluded = await articleService.findByAuthor('1', {
      excludeRestricted: true,
    })
    expect(excluded).not.toContain(articles[0])
  })
})

test('findByCommentedAuthor', async () => {
  const articles = await articleService.findByCommentedAuthor({ id: '1' })
  expect(articles.length).toBeDefined()
})
test('countAppreciations', async () => {
  expect(await articleService.countAppreciations('1')).toBe(5)
  expect(await articleService.countAppreciations('0')).toBe(0)
})

test('findAppreciations', async () => {
  const appreciations = await articleService.findAppreciations({
    referenceId: '1',
  })
  expect(appreciations.length).toBe(5)

  const appreciations2 = await articleService.findAppreciations({
    referenceId: '1',
    take: 1,
  })
  expect(appreciations2.length).toBe(1)
  expect(appreciations[0].totalCount).toBe('5')
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
  const getArticleFromDb = async (id: string) =>
    articleService.baseFindById(id) as Promise<Article>
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

describe('search', () => {
  test('exclude articles in article_recommend_setting table', async () => {
    const { nodes } = await articleService.search({
      key: '1',
      take: 1,
      skip: 0,
    })
    expect(nodes.length).toBe(1)

    await atomService.create({
      table: 'article_recommend_setting',
      data: { articleId: nodes[0].id, inSearch: false },
    })

    const { nodes: excluded } = await articleService.search({
      key: '1',
      take: 1,
      skip: 0,
    })
    expect(nodes.length).toBe(1)

    expect(excluded.length).toBe(0)
  })
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

    // both case insensitive and Chinese simplified/traditional insensitive
    await articleService.createArticle({
      title: 'Uppercase',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes2 } = await articleService.searchV3({
      key: 'uppercase',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes2.length).toBe(1)

    await articleService.createArticle({
      title: '測試',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes3 } = await articleService.searchV3({
      key: '测试',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes3.length).toBe(1)

    await articleService.createArticle({
      title: '试测',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes4 } = await articleService.searchV3({
      key: '試測',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes4.length).toBe(1)

    await articleService.createArticle({
      title: '測测',
      content: '',
      authorId: '1',
    })
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
    nodes.forEach((node) => {
      expect(node.authorId).toBe('2')
    })
  })
  test('exclude articles in article_recommend_setting table', async () => {
    const [article] = await articleService.createArticle({
      title: 'test article_recommend_setting',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes } = await articleService.searchV3({
      key: 'article_recommend_setting',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes.length).toBe(1)
    expect(nodes[0].id).toBe(article.id)

    await atomService.create({
      table: 'article_recommend_setting',
      data: { articleId: article.id, inSearch: false },
    })

    const { nodes: excluded } = await articleService.searchV3({
      key: 'article_recommend_setting',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(excluded.length).toBe(0)
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
  expect(articles[0].id).toBeDefined()
  expect(articles[0].authorId).toBeDefined()
  expect(articles[0].state).toBeDefined()
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

test('loadLatestArticleVersion', async () => {
  const articleVersion = await articleService.loadLatestArticleVersion('1')
  expect(articleVersion.articleId).toBe('1')
})

test('countArticleVersions', async () => {
  const count = await articleService.countArticleVersions('1')
  expect(count).toBe(1)
  await articleService.createNewArticleVersion('1', '1', { content: 'test2' })
  const count2 = await articleService.countArticleVersions('1')
  expect(count2).toBe(2)
})

describe('createNewArticleVersion', () => {
  test('provide description or not', async () => {
    const articleVersion = await articleService.createNewArticleVersion(
      '1',
      '1',
      { canComment: false }
    )
    expect(articleVersion.description).toBe(null)

    const articleVersion2 = await articleService.createNewArticleVersion(
      '1',
      '1',
      { canComment: false },
      undefined
    )
    expect(articleVersion2.description).toBe(null)

    const description = 'test desc'
    const articleVersion3 = await articleService.createNewArticleVersion(
      '1',
      '1',
      { canComment: false },
      description
    )
    expect(articleVersion3.description).toBe(description)
  })
})

describe('findArticleVersions', () => {
  test('return content change versions', async () => {
    const [, count1] = await articleService.findArticleVersions('2')
    expect(count1).toBeGreaterThan(0)

    const changedContent = 'text change'
    await articleService.createNewArticleVersion('2', '2', {
      content: changedContent,
    })
    const [, count2] = await articleService.findArticleVersions('2')
    expect(count2).toBe(count1 + 1)

    await articleService.createNewArticleVersion('2', '2', {
      title: 'new title',
    })
    const [, count3] = await articleService.findArticleVersions('2')
    expect(count3).toBe(count2 + 1)

    await articleService.createNewArticleVersion('2', '2', {
      summary: 'new summary',
    })
    const [, count4] = await articleService.findArticleVersions('2')
    expect(count4).toBe(count3 + 1)

    await articleService.createNewArticleVersion('2', '2', { cover: '1' })
    const [, count5] = await articleService.findArticleVersions('2')
    expect(count5).toBe(count4 + 1)

    await articleService.createNewArticleVersion('2', '2', {
      tags: ['new tags'],
    })
    const [, count6] = await articleService.findArticleVersions('2')
    expect(count6).toBe(count5 + 1)

    await articleService.createNewArticleVersion('2', '2', {
      collection: ['1'],
    })
    const [, count7] = await articleService.findArticleVersions('2')
    expect(count7).toBe(count6 + 1)

    // create new version with no content change
    await articleService.createNewArticleVersion('2', '2', {
      sensitiveByAuthor: true,
    })
    const [, count8] = await articleService.findArticleVersions('2')
    expect(count8).toBe(count7)
  })
})
