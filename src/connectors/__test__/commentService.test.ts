import { v4 as uuidv4 } from 'uuid'
import type { Connections } from 'definitions'

import { COMMENT_STATE, COMMENT_TYPE, USER_STATE } from 'common/enums'

import {
  CommentService,
  AtomService,
  JournalService,
  UserService,
} from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let atomService: AtomService
let commentService: CommentService
let journalService: JournalService
let userService: UserService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  commentService = new CommentService(connections)
  journalService = new JournalService(connections)
  userService = new UserService(connections)
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

    // archived/banned comments excluded
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: '1',
        state: COMMENT_STATE.archived,
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
        parentCommentId: '1',
        state: COMMENT_STATE.banned,
        uuid: uuidv4(),
        authorId: '1',
      },
    })

    const [_, count2] = await commentService.findByParent({ id: '1' })
    expect(count2).toBe(count)
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

    // when state is provided, filter by state
    const [comments5, _] = await commentService.find({
      where: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
        state: 'archived',
      },
    })
    expect(comments5.map((c) => c.id)).toContain(archived.id)
    comments5.forEach((comment) => {
      expect(comment.state).toBe('archived')
    })
  })
  test('return all comments when parentCommentId not specified', async () => {
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })
    const [comments, _] = await commentService.find({
      where: {
        type: 'article',
        targetId: '1',
        targetTypeId,
        state: 'archived',
      },
    })
    const parentCommentIds = comments.map((c) => c.parentCommentId)
    expect(parentCommentIds).toContain(null)
    expect(parentCommentIds.filter((id) => id !== null).length).toBeGreaterThan(
      0
    )
  })
})

test('count comments', async () => {
  const { id: targetTypeId } = await atomService.findFirst({
    table: 'entity_type',
    where: { table: 'article' },
  })

  const originalCount = await commentService.count('1', COMMENT_TYPE.article)

  // archived/banned comments should be filtered
  await atomService.create({
    table: 'comment',
    data: {
      type: COMMENT_TYPE.article,
      targetId: '1',
      targetTypeId,
      parentCommentId: null,
      state: COMMENT_STATE.archived,
      uuid: uuidv4(),
      authorId: '1',
    },
  })
  await atomService.create({
    table: 'comment',
    data: {
      type: COMMENT_TYPE.article,
      targetId: '1',
      targetTypeId,
      parentCommentId: null,
      state: COMMENT_STATE.banned,
      uuid: uuidv4(),
      authorId: '1',
    },
  })

  const count1 = await commentService.count('1', COMMENT_TYPE.article)
  expect(count1).toBe(originalCount)

  // active/collapsed comments should be included
  await atomService.create({
    table: 'comment',
    data: {
      type: COMMENT_TYPE.article,
      targetId: '1',
      targetTypeId,
      parentCommentId: null,
      state: COMMENT_STATE.active,
      uuid: uuidv4(),
      authorId: '1',
    },
  })
  await atomService.create({
    table: 'comment',
    data: {
      type: COMMENT_TYPE.article,
      targetId: '1',
      targetTypeId,
      parentCommentId: null,
      state: COMMENT_STATE.collapsed,
      uuid: uuidv4(),
      authorId: '1',
    },
  })
  const count2 = await commentService.count('1', COMMENT_TYPE.article)
  expect(count2).toBe(originalCount + 2)
})

describe('find commented followees', () => {
  const journalAuthorId = '1'
  const commentAuthorId = '2'
  const viewerId = '4'
  const otherUserId = '5'
  const targetTypeId = '42' // fake entity type id
  test('found nothing', async () => {
    const journal = await journalService.create(
      { content: 'test' },
      { id: journalAuthorId, state: USER_STATE.active }
    )
    const followees = await commentService.findCommentedFollowees(
      {
        id: journal.id,
        type: COMMENT_TYPE.journal,
        authorId: journalAuthorId,
      },
      viewerId
    )
    expect(followees.length).toBe(0)
  })
  test('found', async () => {
    const journal = await journalService.create(
      { content: 'test' },
      { id: journalAuthorId, state: USER_STATE.active }
    )
    await atomService.create({
      table: 'comment',
      data: {
        type: COMMENT_TYPE.journal,
        targetId: journal.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: commentAuthorId,
      },
    })
    // journal has comments but viewer has not followees
    const followees1 = await commentService.findCommentedFollowees(
      {
        id: journal.id,
        type: COMMENT_TYPE.journal,
        authorId: journalAuthorId,
      },
      viewerId
    )
    expect(followees1.length).toBe(0)

    // viewer has followees but they have not commented on this journal
    await userService.follow(viewerId, otherUserId)
    const followees2 = await commentService.findCommentedFollowees(
      {
        id: journal.id,
        type: COMMENT_TYPE.journal,
        authorId: journalAuthorId,
      },
      viewerId
    )
    expect(followees2.length).toBe(0)

    // viewer has followees but they have not commented on this journal
    await userService.follow(viewerId, commentAuthorId)
    const followees3 = await commentService.findCommentedFollowees(
      {
        id: journal.id,
        type: COMMENT_TYPE.journal,
        authorId: journalAuthorId,
      },
      viewerId
    )
    expect(followees3.length).toBe(1)
    expect(followees3[0].id).toBe(commentAuthorId)

    // do not include journal author
    await atomService.create({
      table: 'comment',
      data: {
        type: COMMENT_TYPE.journal,
        targetId: journal.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: journalAuthorId,
      },
    })
    await userService.follow(viewerId, journalAuthorId)
    const followees4 = await commentService.findCommentedFollowees(
      {
        id: journal.id,
        type: COMMENT_TYPE.journal,
        authorId: journalAuthorId,
      },
      viewerId
    )
    expect(followees4.length).toBe(1)
  })
})
