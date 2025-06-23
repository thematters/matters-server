import type { Connections } from '#definitions/index.js'

import { FEATURE_NAME, FEATURE_FLAG } from '#common/enums/index.js'
import { PublicationService } from '../../article/publicationService.js'
import { AtomService } from '../../atomService.js'
import { SearchService } from '../../searchService.js'
import { SystemService } from '../../systemService.js'

import { genConnections, closeConnections } from '../utils.js'

let connections: Connections
let publicationService: PublicationService
let atomService: AtomService
let systemService: SystemService
let searchService: SearchService

beforeAll(async () => {
  connections = await genConnections()
  publicationService = new PublicationService(connections)
  atomService = new AtomService(connections)
  systemService = new SystemService(connections)
  searchService = new SearchService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('search', () => {
  test('exclude articles in article_recommend_setting table', async () => {
    const { nodes } = await searchService.searchArticles({
      key: '1',
      take: 1,
      skip: 0,
    })
    expect(nodes.length).toBe(1)

    await atomService.create({
      table: 'article_recommend_setting',
      data: { articleId: nodes[0].id, inSearch: false },
    })

    const { nodes: excluded } = await searchService.searchArticles({
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
    const { nodes, totalCount } = await searchService.searchArticles({
      key: 'test',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes.length).toBe(1)
    expect(totalCount).toBeGreaterThan(0)

    // both case insensitive and Chinese simplified/traditional insensitive
    await publicationService.createArticle({
      title: 'Uppercase',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes2 } = await searchService.searchArticles({
      key: 'uppercase',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes2.length).toBe(1)

    await publicationService.createArticle({
      title: '測試',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes3 } = await searchService.searchArticles({
      key: '测试',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes3.length).toBe(1)

    await publicationService.createArticle({
      title: '试测',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes4 } = await searchService.searchArticles({
      key: '試測',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes4.length).toBe(1)

    await publicationService.createArticle({
      title: '測测',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes5 } = await searchService.searchArticles({
      key: '測测',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes5.length).toBe(1)

    // mixed case will not match in current implementation
    const { nodes: nodes6 } = await searchService.searchArticles({
      key: '测測',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(nodes6.length).toBe(0)
  })
  test('filter by authorId', async () => {
    const { nodes } = await searchService.searchArticles({
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
    const [article] = await publicationService.createArticle({
      title: 'test article_recommend_setting',
      content: '',
      authorId: '1',
    })
    const { nodes: nodes } = await searchService.searchArticles({
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

    const { nodes: excluded } = await searchService.searchArticles({
      key: 'article_recommend_setting',
      take: 1,
      skip: 0,
      quicksearch: true,
    })
    expect(excluded.length).toBe(0)
  })
  test('spam are excluded', async () => {
    const [article] = await publicationService.createArticle({
      title: 'test spam',
      content: '',
      authorId: '1',
    })

    const spamThreshold = 0.5
    await systemService.setFeatureFlag({
      name: FEATURE_NAME.spam_detection,
      flag: FEATURE_FLAG.on,
      value: spamThreshold,
    })

    await atomService.update({
      table: 'article',
      where: { id: article.id },
      data: { spamScore: spamThreshold + 0.1 },
    })
  })
})
