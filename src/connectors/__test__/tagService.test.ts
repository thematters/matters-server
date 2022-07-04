import { TagService } from 'connectors'

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
    ['id', 'content']
  )
  expect(tag.content).toEqual(content)
})
