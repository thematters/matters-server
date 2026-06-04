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

const createMoment = async (authorId: string) => {
  return atomService.create({
    table: 'moment',
    data: {
      shortHash: v4().slice(0, 12),
      content: 'test moment',
      authorId,
      state: MOMENT_STATE.active,
    },
  })
}

const likeMoment = async (momentId: string, userId: string) => {
  await atomService.create({
    table: 'action_moment',
    data: { targetId: momentId, userId, action: 'like' },
  })
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
})
