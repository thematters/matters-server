import { v4 as uuidv4 } from 'uuid'
import type { Connections } from 'definitions'

import { CommentService, AtomService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let atomService: AtomService
let commentService: CommentService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
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

describe('find comments', () => {
  test('filter archived/banned comments (except those which have active sub comments) by default', async () => {
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })
    const [comments, count] = await commentService.find({
      where: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
      },
    })
    comments.forEach((comment) => {
      expect(comment.type).toBe('article')
      expect(comment.targetId).toBe('1')
      expect(comment.targetTypeId).toBe(targetTypeId)
      expect(comment.parentCommentId).toBeNull()
    })
    expect(count).toBeGreaterThan(0)

    // archived/banned comments should be filtered
    const archived = await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
        state: 'archived',
        uuid: uuidv4(),
        authorId: '1',
      },
    })
    const banned = await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
        state: 'banned',
        uuid: uuidv4(),
        authorId: '1',
      },
    })
    const [comments2, count2] = await commentService.find({
      where: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
      },
    })
    expect(comments2.map((c) => c.id)).not.toContain(archived.id)
    expect(comments2.map((c) => c.id)).not.toContain(banned.id)
    expect(count2).toBe(count)

    // archived/banned comments should be included if they have active sub comments
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: archived.id,
        state: 'archived',
        uuid: uuidv4(),
        authorId: '1',
      },
    })
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: banned.id,
        state: 'banned',
        uuid: uuidv4(),
        authorId: '1',
      },
    })
    const [comments3, count3] = await commentService.find({
      where: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
      },
    })
    expect(comments3.map((c) => c.id)).not.toContain(archived.id)
    expect(comments3.map((c) => c.id)).not.toContain(banned.id)
    expect(count3).toBe(count)

    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: archived.id,
        state: 'active',
        uuid: uuidv4(),
        authorId: '1',
      },
    })
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: banned.id,
        state: 'collapsed',
        uuid: uuidv4(),
        authorId: '1',
      },
    })
    const [comments4, count4] = await commentService.find({
      where: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
      },
    })
    expect(comments4.map((c) => c.id)).toContain(archived.id)
    expect(comments4.map((c) => c.id)).toContain(banned.id)
    expect(count4).toBe(count + 2)
  })
})
