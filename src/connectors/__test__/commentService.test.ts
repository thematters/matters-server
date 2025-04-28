import { v4 as uuidv4 } from 'uuid'
import type { Connections } from '#definitions/index.js'

import { COMMENT_STATE, COMMENT_TYPE, USER_STATE } from '#common/enums/index.js'

import {
  CommentService,
  AtomService,
  MomentService,
  UserService,
  ArticleService,
} from '#connectors/index.js'

import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let atomService: AtomService
let articleService: ArticleService
let commentService: CommentService
let momentService: MomentService
let userService: UserService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  articleService = new ArticleService(connections)
  commentService = new CommentService(connections)
  momentService = new MomentService(connections)
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
  const momentAuthorId = '1'
  const commentAuthorId = '2'
  const viewerId = '4'
  const otherUserId = '5'
  const targetTypeId = '42' // fake entity type id
  test('found nothing', async () => {
    const moment = await momentService.create(
      { content: 'test' },
      { id: momentAuthorId, state: USER_STATE.active, userName: 'test' }
    )
    const followees = await commentService.findCommentedFollowees(
      {
        id: moment.id,
        type: COMMENT_TYPE.moment,
        authorId: momentAuthorId,
      },
      viewerId
    )
    expect(followees.length).toBe(0)
  })
  test('found', async () => {
    const moment = await momentService.create(
      { content: 'test' },
      { id: momentAuthorId, state: USER_STATE.active, userName: 'test' }
    )
    await atomService.create({
      table: 'comment',
      data: {
        type: COMMENT_TYPE.moment,
        targetId: moment.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: commentAuthorId,
      },
    })
    // moment has comments but viewer has not followees
    const followees1 = await commentService.findCommentedFollowees(
      {
        id: moment.id,
        type: COMMENT_TYPE.moment,
        authorId: momentAuthorId,
      },
      viewerId
    )
    expect(followees1.length).toBe(0)

    // viewer has followees but they have not commented on this moment
    await userService.follow(viewerId, otherUserId)
    const followees2 = await commentService.findCommentedFollowees(
      {
        id: moment.id,
        type: COMMENT_TYPE.moment,
        authorId: momentAuthorId,
      },
      viewerId
    )
    expect(followees2.length).toBe(0)

    // viewer has followees but they have not commented on this moment
    await userService.follow(viewerId, commentAuthorId)
    const followees3 = await commentService.findCommentedFollowees(
      {
        id: moment.id,
        type: COMMENT_TYPE.moment,
        authorId: momentAuthorId,
      },
      viewerId
    )
    expect(followees3.length).toBe(1)
    expect(followees3[0].id).toBe(commentAuthorId)

    // do not include moment author
    await atomService.create({
      table: 'comment',
      data: {
        type: COMMENT_TYPE.moment,
        targetId: moment.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: momentAuthorId,
      },
    })
    await userService.follow(viewerId, momentAuthorId)
    const followees4 = await commentService.findCommentedFollowees(
      {
        id: moment.id,
        type: COMMENT_TYPE.moment,
        authorId: momentAuthorId,
      },
      viewerId
    )
    expect(followees4.length).toBe(1)
  })
})

describe('upvote', () => {
  test("blockee can not upvote comments under blockers' works", async () => {
    const comment = await atomService.commentIdLoader.load('1')
    expect(comment.type).toBe('article')
    const targetAuthorId = (
      await atomService.articleIdLoader.load(comment.targetId)
    ).authorId
    const voter = await userService.create({ userName: 'voter' })

    await userService.block(targetAuthorId, voter.id)

    expect(
      commentService.upvote({ user: voter, comment })
    ).rejects.toThrowError()
  })
})

describe('addCommentCountColumn', () => {
  test('', async () => {
    const [article1] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: '1',
    })
    const [article2] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: '1',
    })
    const [article3] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: '1',
    })
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })

    await Promise.all([
      atomService.create({
        table: 'comment',
        data: {
          type: 'article',
          targetId: article1.id,
          targetTypeId,
          parentCommentId: null,
          state: COMMENT_STATE.active,
          uuid: uuidv4(),
          authorId: '1',
        },
      }),
      atomService.create({
        table: 'comment',
        data: {
          type: 'article',
          targetId: article1.id,
          targetTypeId,
          parentCommentId: null,
          state: COMMENT_STATE.active,
          uuid: uuidv4(),
          authorId: '1',
        },
      }),
      atomService.create({
        table: 'comment',
        data: {
          type: 'article',
          targetId: article2.id,
          targetTypeId,
          parentCommentId: null,
          state: COMMENT_STATE.active,
          uuid: uuidv4(),
          authorId: '1',
        },
      }),
    ])

    const articlesQuery = connections
      .knex('article')
      .select('id')
      .whereIn('id', [article1.id, article2.id, article3.id])
      .orderBy('id', 'asc')

    const { query } = await commentService.addCommentCountColumn(articlesQuery)

    const results = await query

    expect(results).toHaveLength(3)
    expect(results[0].commentCount).toBe('2')
    expect(results[1].commentCount).toBe('1')
    expect(results[2].commentCount).toBe('0')
  })
})

describe('addNotAuthorCommentCountColumn', () => {
  test('counts only comments not by the article author', async () => {
    const [article1] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: '1',
    })
    const [article2] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: '2',
    })
    const [article3] = await articleService.createArticle({
      title: 'test',
      content: 'test',
      authorId: '3',
    })
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })

    // Comments by article authors (should NOT be counted)
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: article1.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: '1', // same as article1 author
      },
    })
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: article2.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: '2', // same as article2 author
      },
    })

    // Comments NOT by article authors (should be counted)
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: article1.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: '2',
      },
    })
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: article1.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: '3',
      },
    })
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: article2.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: '1',
      },
    })

    const articlesQuery = connections
      .knex('article')
      .select('id')
      .whereIn('id', [article1.id, article2.id, article3.id])
      .orderBy('id', 'asc')

    const { query } = await commentService.addNotAuthorCommentCountColumn(
      articlesQuery
    )
    const results = await query

    expect(results).toHaveLength(3)
    // article1: 2 comments not by author
    expect(results[0].notAuthorCommentCount).toBe('2')
    // article2: 1 comment not by author
    expect(results[1].notAuthorCommentCount).toBe('1')
    // article3: 0 comments
    expect(results[2].notAuthorCommentCount).toBe('0')
  })

  test('respects the start date filter', async () => {
    const [article] = await articleService.createArticle({
      title: 'test with date',
      content: 'test',
      authorId: '10',
    })
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })

    // Comment before the start date
    const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) // 2 days ago
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: article.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: '11',
        createdAt: oldDate,
      },
    })

    // Comment after the start date
    const recentDate = new Date()
    await atomService.create({
      table: 'comment',
      data: {
        type: 'article',
        targetId: article.id,
        targetTypeId,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        uuid: uuidv4(),
        authorId: '12',
        createdAt: recentDate,
      },
    })

    const articlesQuery = connections
      .knex('article')
      .select('id')
      .where('id', article.id)

    // Only count comments after yesterday
    const start = new Date(Date.now() - 1000 * 60 * 60 * 24)
    const { query } = await commentService.addNotAuthorCommentCountColumn(
      articlesQuery,
      { start }
    )
    const results = await query

    expect(results).toHaveLength(1)
    expect(results[0].notAuthorCommentCount).toBe('1')
  })
})
