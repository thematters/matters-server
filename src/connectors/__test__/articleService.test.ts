import { ArticleService } from '../articleService'

const articleService = new ArticleService()
const { knex } = articleService

beforeAll(async () => {
  await knex.migrate.rollback()
  await knex.migrate.latest()
  await knex.seed.run()
})

afterAll(async () => {
  await knex.destroy()
})

test('countByAuthor', async () => {
  const count = await articleService.countByAuthor(1)
  expect(count).toBe(2)
})

test('countAppreciation by aritlce id', async () => {
  const appreciation = await articleService.countAppreciation(1)
  expect(appreciation).toBe(150)
})
