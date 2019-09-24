import { tagService } from '../tagService'

test('countArticles', async () => {
  const count = await tagService.countArticles('2')
  expect(count).toBeDefined()
})

test('findArticleIds', async () => {
  const articleIds = await tagService.findArticleIds({ id: '2' })
  expect(articleIds).toBeDefined()
})

test('create', async () => {
  const content = 'foo'
  const tag = await tagService.create({ content })
  expect(tag.content).toEqual(content)
})
