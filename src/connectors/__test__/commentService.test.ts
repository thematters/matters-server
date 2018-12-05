import { CommentService } from '../commentService'

const commentService = new CommentService()
const { knex } = commentService

beforeAll(async () => {
  await knex.migrate.rollback()
  await knex.migrate.latest()
  await knex.seed.run()
})

afterAll(async () => {
  await knex.destroy()
})

test('countByAuthor', async () => {
  const count = await commentService.countByAuthor(1)
  expect(count).toBe(2)
})

test('countByArticle', async () => {
  const count = await commentService.countByArticle(3)
  expect(count).toBe(2)
})

test('countByParent', async () => {
  const count = await commentService.countByParent(1)
  expect(count).toBe(1)
})

test('countUpVoteByTargetId', async () => {
  const count = await commentService.countUpVoteByTargetId(1)
  expect(count).toBe(1)
})

test('countDownVoteByTargetId', async () => {
  const count = await commentService.countDownVoteByTargetId(3)
  expect(count).toBe(0)
})

test('findByAuthor', async () => {
  const comments = await commentService.findByAuthor(1)
  expect(comments.length).toBe(2)
})

test('findByArticle', async () => {
  const comments = await commentService.findByArticle(3)
  expect(comments.length).toBe(2)
})

test('findPinnedByArticle', async () => {
  const comments = await commentService.findPinnedByArticle(3)
  expect(comments.length).toBe(1)
})

test('findByParent', async () => {
  const comments = await commentService.findByParent(1)
  expect(comments.length).toBe(1)
})

test('findUpVoteByTargetId', async () => {
  const votes = await commentService.findUpVoteByTargetId(1)
  expect(votes.length).toBe(1)
})

test('findDownVoteByTargetId', async () => {
  const votes = await commentService.findDownVoteByTargetId(3)
  expect(votes.length).toBe(0)
})
