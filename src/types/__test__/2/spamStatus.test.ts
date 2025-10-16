import type { Connections } from '#definitions/index.js'

import { v4 } from 'uuid'
import { NODE_TYPES } from '#common/enums/index.js'
import { AtomService, MomentService } from '#connectors/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../utils.js'

let connections: Connections
let atomService: AtomService
let momentService: MomentService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  momentService = new MomentService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

beforeEach(async () => {
  // Clean up test data
  await atomService.deleteMany({ table: 'action_comment' })
  await atomService.deleteMany({ table: 'comment' })
  await atomService.deleteMany({ table: 'moment' })
})

describe('Comment spam status', () => {
  const GET_COMMENT_SPAM_STATUS = /* GraphQL */ `
    query ($nodeInput: NodeInput!) {
      node(input: $nodeInput) {
        ... on Comment {
          id
          spamStatus {
            score
            isSpam
          }
        }
      }
    }
  `

  test('returns spam status for comment with null values', async () => {
    // Create a comment with null spam status
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })

    const comment = await atomService.create({
      table: 'comment',
      data: {
        uuid: v4(),
        content: 'test comment',
        authorId: '1',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
        type: 'article',
        state: 'active',
        spamScore: null,
        isSpam: null,
      },
    })

    const server = await testClient({ isAdmin: true, connections })
    const { errors, data } = await server.executeOperation({
      query: GET_COMMENT_SPAM_STATUS,
      variables: {
        nodeInput: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.node.spamStatus).toEqual({
      score: null,
      isSpam: null,
    })
  })

  test('returns spam status for comment with values', async () => {
    // Create a comment with spam status values
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })

    const comment = await atomService.create({
      table: 'comment',
      data: {
        uuid: v4(),
        content: 'spam comment',
        authorId: '1',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
        type: 'article',
        state: 'active',
        spamScore: 0.8,
        isSpam: true,
      },
    })

    const server = await testClient({ isAdmin: true, connections })
    const { errors, data } = await server.executeOperation({
      query: GET_COMMENT_SPAM_STATUS,
      variables: {
        nodeInput: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.node.spamStatus).toEqual({
      score: 0.8,
      isSpam: true,
    })
  })

  test('requires admin access for spam status', async () => {
    // Create a comment
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })

    const comment = await atomService.create({
      table: 'comment',
      data: {
        uuid: v4(),
        content: 'test comment',
        authorId: '1',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
        type: 'article',
        state: 'active',
        spamScore: 0.5,
        isSpam: false,
      },
    })

    const server = await testClient({ connections })
    const { errors } = await server.executeOperation({
      query: GET_COMMENT_SPAM_STATUS,
      variables: {
        nodeInput: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
        },
      },
    })

    expect(errors).toBeDefined()
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
})

describe('Moment spam status', () => {
  const GET_MOMENT_SPAM_STATUS = /* GraphQL */ `
    query ($input: MomentInput!) {
      moment(input: $input) {
        id
        spamStatus {
          score
          isSpam
        }
      }
    }
  `

  test('returns spam status for moment with null values', async () => {
    // Create a moment with null spam status
    const moment = await momentService.create(
      { content: 'test moment' },
      { id: '1', state: 'active', userName: 'test' }
    )

    // Update the moment with null spam status
    await atomService.update({
      table: 'moment',
      where: { id: moment.id },
      data: {
        spamScore: null,
        isSpam: null,
      },
    })

    const server = await testClient({ isAdmin: true, connections })
    const { errors, data } = await server.executeOperation({
      query: GET_MOMENT_SPAM_STATUS,
      variables: {
        input: { shortHash: moment.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.moment.spamStatus).toEqual({
      score: null,
      isSpam: null,
    })
  })

  test('returns spam status for moment with values', async () => {
    // Create a moment with spam status values
    const moment = await momentService.create(
      { content: 'spam moment' },
      { id: '1', state: 'active', userName: 'test' }
    )

    // Update the moment with spam status values
    await atomService.update({
      table: 'moment',
      where: { id: moment.id },
      data: {
        spamScore: 0.9,
        isSpam: true,
      },
    })

    const server = await testClient({ isAdmin: true, connections })
    const { errors, data } = await server.executeOperation({
      query: GET_MOMENT_SPAM_STATUS,
      variables: {
        input: { shortHash: moment.shortHash },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.moment.spamStatus).toEqual({
      score: 0.9,
      isSpam: true,
    })
  })

  test('requires admin access for spam status', async () => {
    // Create a moment
    const moment = await momentService.create(
      { content: 'test moment' },
      { id: '1', state: 'active', userName: 'test' }
    )

    // Update the moment with spam status values
    await atomService.update({
      table: 'moment',
      where: { id: moment.id },
      data: {
        spamScore: 0.3,
        isSpam: false,
      },
    })

    const server = await testClient({ connections })
    const { errors } = await server.executeOperation({
      query: GET_MOMENT_SPAM_STATUS,
      variables: {
        input: { shortHash: moment.shortHash },
      },
    })

    expect(errors).toBeDefined()
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
})
