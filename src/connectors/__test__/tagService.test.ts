import { TagService } from 'connectors/index.js'

const tagService = new TagService()

test('countArticles', async () => {
  const count = await tagService.countArticles({ id: '2' })
  expect(count).toBeDefined()
})

test('findArticleIds', async () => {
  const articleIds = await tagService.findArticleIds({ id: '2' })
  expect(articleIds).toBeDefined()
})

test('create', async () => {
  const content = 'foo'
  const tag = await tagService.create(
    {
      content,
      creator: '0',
      editors: [],
      owner: '0',
    },
    {
      columns: ['id', 'content'],
    }
  )
  expect(tag.content).toEqual(content)
})

describe('searchV1', () => {
  test('empty result', async () => {
    const res = await tagService.searchV1({
      key: 'not-existed-tag',
      skip: 0,
      take: 10,
    })
    expect(res.totalCount).toBe(0)
  })
  test('prefer exact match', async () => {
    const res = await tagService.searchV1({ key: 'tag', skip: 0, take: 10 })
    expect(res.totalCount).toBe(4)
    expect(res.nodes[0].content).toBe('tag')
  })
  test('prefer more articles', async () => {
    const res = await tagService.searchV1({
      key: 't',
      skip: 0,
      take: 10,
      quicksearch: true,
    })
    console.log(new Date(), 'res:', res)
    expect(res.nodes?.[0]?.numArticles).toBeGreaterThanOrEqual(
      res.nodes?.[1]?.numArticles
    )
    expect(res.nodes?.[1]?.numArticles).toBeGreaterThanOrEqual(
      res.nodes?.[2]?.numArticles
    )
  })
  test('handle prefix #,＃', async () => {
    const res1 = await tagService.searchV1({ key: '#tag', skip: 0, take: 10 })
    expect(res1.totalCount).toBe(4)
    expect(res1.nodes[0].content).toBe('tag')
    const res2 = await tagService.searchV1({ key: '＃tag', skip: 0, take: 10 })
    expect(res2.totalCount).toBe(4)
    expect(res2.nodes[0].content).toBe('tag')
  })
  test('handle empty string', async () => {
    const res1 = await tagService.searchV1({ key: '', skip: 0, take: 10 })
    expect(res1.totalCount).toBe(0)
    const res2 = await tagService.searchV1({ key: '#', skip: 0, take: 10 })
    expect(res2.totalCount).toBe(0)
  })
  test('right totalCount with take and skip', async () => {
    const res1 = await tagService.searchV1({
      key: 'tag',
      skip: 0,
      take: 10,
      quicksearch: true,
    })
    console.log(new Date(), 'res:', res1)
    expect(res1.nodes.length).toBe(4)
    expect(res1.totalCount).toBe(4)
    const res2 = await tagService.searchV1({
      key: 'tag',
      skip: 0,
      take: 1,
      quicksearch: true,
    })
    expect(res2.nodes.length).toBe(1)
    expect(res2.totalCount).toBe(4)
    const res3 = await tagService.searchV1({
      key: 'tag',
      skip: 1,
      take: 10,
      quicksearch: true,
    })
    expect(res3.nodes.length).toBe(3)
    expect(res3.totalCount).toBe(4)
  })
})
