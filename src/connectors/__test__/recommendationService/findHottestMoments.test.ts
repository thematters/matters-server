import type { Connections, User } from '#definitions/index.js'

import { v4 } from 'uuid'

import {
  MOMENT_STATE,
  MOMENT_FEED_STATE,
  COMMENT_STATE,
  COMMENT_TYPE,
} from '#common/enums/index.js'
import { AtomService } from '../../atomService.js'
import { RecommendationService } from '../../recommendationService.js'
import { UserService } from '../../userService.js'

import { genConnections, closeConnections } from '../utils.js'

let connections: Connections
let atomService: AtomService
let userService: UserService
let recommendationService: RecommendationService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  userService = new UserService(connections)
  recommendationService = new RecommendationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const approveAuthor = async (): Promise<User> => {
  const user = await userService.create()
  await connections.knex('moment_feed_user').insert({
    userId: user.id,
    state: MOMENT_FEED_STATE.approved,
  })
  return user
}

const createMoment = async (authorId: string, createdAt?: Date) => {
  return atomService.create({
    table: 'moment',
    data: {
      shortHash: v4().slice(0, 12),
      content: 'test moment',
      authorId,
      state: MOMENT_STATE.active,
      ...(createdAt ? { createdAt } : {}),
    },
  })
}

const likeMoment = async (
  momentId: string,
  userId: string,
  createdAt?: Date
) => {
  await atomService.create({
    table: 'action_moment',
    data: {
      targetId: momentId,
      userId,
      action: 'like',
      ...(createdAt ? { createdAt } : {}),
    },
  })
}

const createMomentWithLikers = async (
  authorId: string,
  likerCount: number,
  options?: { createdAt?: Date; likeCreatedAt?: Date }
) => {
  const moment = await createMoment(authorId, options?.createdAt)
  for (let i = 0; i < likerCount; i++) {
    const liker = await userService.create()
    await likeMoment(moment.id, liker.id, options?.likeCreatedAt)
  }
  return moment
}

describe('findHottestMoments', () => {
  const params = {
    days: 7,
    decayDays: 5,
    likeWeight: 4,
    commentWeight: 6,
    likesThreshold: 2,
    commentsThreshold: 1,
    maxTake: 300,
    windowHours: 48,
    limitPerWindow: 3,
  }

  test('moment with likers over threshold is included', async () => {
    const author = await approveAuthor()
    const liker1 = await userService.create()
    const liker2 = await userService.create()
    const moment = await createMoment(author.id)
    await likeMoment(moment.id, liker1.id)
    await likeMoment(moment.id, liker2.id)

    const result = await recommendationService.findHottestMoments(params)
    expect(result.map(({ momentId }) => momentId)).toContain(moment.id)
  })

  test('moment with likers under threshold is excluded', async () => {
    const author = await approveAuthor()
    const liker1 = await userService.create()
    const moment = await createMoment(author.id)
    await likeMoment(moment.id, liker1.id)

    const result = await recommendationService.findHottestMoments(params)
    expect(result.map(({ momentId }) => momentId)).not.toContain(moment.id)
  })

  test('moment from non-whitelisted author is excluded', async () => {
    const author = await userService.create()
    const liker1 = await userService.create()
    const liker2 = await userService.create()
    const moment = await createMoment(author.id)
    await likeMoment(moment.id, liker1.id)
    await likeMoment(moment.id, liker2.id)

    const result = await recommendationService.findHottestMoments(params)
    expect(result.map(({ momentId }) => momentId)).not.toContain(moment.id)
  })

  test('comment from distinct author meets comment threshold', async () => {
    const author = await approveAuthor()
    const commenter = await userService.create()
    const moment = await createMoment(author.id)

    const entityType = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'moment' },
    })
    await atomService.create({
      table: 'comment',
      data: {
        type: COMMENT_TYPE.moment,
        targetId: moment.id,
        targetTypeId: entityType.id,
        parentCommentId: null,
        state: COMMENT_STATE.active,
        authorId: commenter.id,
        content: 'nice moment',
        uuid: v4(),
      },
    })

    const result = await recommendationService.findHottestMoments(params)
    expect(result.map(({ momentId }) => momentId)).toContain(moment.id)
  })

  test('keeps the 3 highest-scored moments per 48h window', async () => {
    const author = await approveAuthor()
    const high = await createMomentWithLikers(author.id, 5)
    const mid = await createMomentWithLikers(author.id, 4)
    const low = await createMomentWithLikers(author.id, 3)
    const excluded = await createMomentWithLikers(author.id, 2)

    const result = await recommendationService.findHottestMoments(params)
    const ids = result.map(({ momentId }) => momentId)
    expect(ids).toContain(high.id)
    expect(ids).toContain(mid.id)
    expect(ids).toContain(low.id)
    expect(ids).not.toContain(excluded.id)
  })

  test('caps each 48h window independently', async () => {
    // window is anchored at the author's latest moment and grouped backwards;
    // a moment in an earlier window is not affected by a full latest window
    const author = await approveAuthor()
    const now = new Date()
    const earlierWindow = new Date(now.getTime() - 60 * 3600 * 1000)
    const w0High = await createMomentWithLikers(author.id, 5, {
      createdAt: now,
    })
    const w0Mid = await createMomentWithLikers(author.id, 4, { createdAt: now })
    const w0Low = await createMomentWithLikers(author.id, 3, { createdAt: now })
    const w0Excluded = await createMomentWithLikers(author.id, 2, {
      createdAt: now,
    })
    const w1 = await createMomentWithLikers(author.id, 2, {
      createdAt: earlierWindow,
    })

    const result = await recommendationService.findHottestMoments(params)
    const ids = result.map(({ momentId }) => momentId)
    expect(ids).toContain(w0High.id)
    expect(ids).toContain(w0Mid.id)
    expect(ids).toContain(w0Low.id)
    expect(ids).not.toContain(w0Excluded.id)
    expect(ids).toContain(w1.id)
  })

  test('breaks score ties by non-decayed engagement within a 48h window', async () => {
    // likes are dated beyond decayDays so decayed score is 0 for all,
    // leaving non-decayed engagement (liker count) as the tiebreaker
    const author = await approveAuthor()
    const oldLike = new Date(Date.now() - 6 * 24 * 3600 * 1000)
    const high = await createMomentWithLikers(author.id, 5, {
      likeCreatedAt: oldLike,
    })
    const mid = await createMomentWithLikers(author.id, 4, {
      likeCreatedAt: oldLike,
    })
    const low = await createMomentWithLikers(author.id, 3, {
      likeCreatedAt: oldLike,
    })
    const excluded = await createMomentWithLikers(author.id, 2, {
      likeCreatedAt: oldLike,
    })

    const result = await recommendationService.findHottestMoments(params)
    const ids = result.map(({ momentId }) => momentId)
    expect(ids).toContain(high.id)
    expect(ids).toContain(mid.id)
    expect(ids).toContain(low.id)
    expect(ids).not.toContain(excluded.id)
  })
})
