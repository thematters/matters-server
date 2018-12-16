import { TagService } from '../tagService'
import { knex } from 'connectors/db'

afterAll(knex.destroy)

const tagService = new TagService()

test('countArticles', async () => {
  const count = await tagService.countArticles({ id: '2' })
  expect(count).toBe(2)
})

test('findArticleIds', async () => {
  const articleIds = await tagService.findArticleIds({ id: '2' })
  expect(articleIds.length).toBe(2)
})

test('create', async () => {
  const content = 'foo'
  const tag = await tagService.create({ content })
  expect(tag.content).toEqual(content)
})
