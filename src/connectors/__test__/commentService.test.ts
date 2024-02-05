import type { Connections } from 'definitions'

import { CommentService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let commentService: CommentService

beforeAll(async () => {
  connections = await genConnections()
  commentService = new CommentService(connections)
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('find subcomments by parent comment id', () => {
  test('found nothing', async () => {
    const [comments, count] = await commentService.findByParent({ id: '100' })
    expect(comments).toEqual([])
    expect(count).toBe(0)
  })
  test('found', async () => {
    const [comments, count] = await commentService.findByParent({ id: '1' })
    expect(comments.length).toBeGreaterThan(0)
    expect(count).toBeGreaterThan(0)
  })
})
