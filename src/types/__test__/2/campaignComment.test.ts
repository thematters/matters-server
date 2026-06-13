import type { Connections, Campaign } from '#definitions/index.js'

import { v4 as uuidv4 } from 'uuid'

import {
  CAMPAIGN_STATE,
  CAMPAIGN_USER_STATE,
  COMMENT_STATE,
  COMMENT_TYPE,
  NODE_TYPES,
} from '#common/enums/index.js'
import {
  AtomService,
  CampaignService,
  CommentService,
} from '#connectors/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../utils.js'

let connections: Connections
let atomService: AtomService
let campaignService: CampaignService
let commentService: CommentService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  campaignService = new CampaignService(connections)
  commentService = new CommentService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const PUT_COMMENT = /* GraphQL */ `
  mutation ($input: PutCommentInput!) {
    putComment(input: $input) {
      id
      node {
        ... on Campaign {
          id
        }
      }
    }
  }
`

const DELETE_COMMENT = /* GraphQL */ `
  mutation ($input: DeleteCommentInput!) {
    deleteComment(input: $input) {
      state
    }
  }
`

const VOTE_COMMENT = /* GraphQL */ `
  mutation ($input: VoteCommentInput!) {
    voteComment(input: $input) {
      id
      upvotes
      downvotes
    }
  }
`

const UNVOTE_COMMENT = /* GraphQL */ `
  mutation ($input: UnvoteCommentInput!) {
    unvoteComment(input: $input) {
      id
      upvotes
      downvotes
    }
  }
`

const TOGGLE_PIN_COMMENT = /* GraphQL */ `
  mutation ($input: ToggleItemInput!) {
    togglePinComment(input: $input) {
      id
      pinned
    }
  }
`

const baseCampaignData = {
  name: 'test campaign discussion',
  applicationPeriod: [new Date('2024-01-01'), new Date('2024-01-02')] as const,
  writingPeriod: [new Date('2024-01-03'), new Date('2024-01-04')] as const,
}

// directly set a campaign_user record to a given state, bypassing the
// auto-approve flow in campaignService.apply (which always succeeds)
const setApplicationState = async (
  campaignId: string,
  userId: string,
  state: (typeof CAMPAIGN_USER_STATE)[keyof typeof CAMPAIGN_USER_STATE]
) => {
  const existing = await atomService.findFirst({
    table: 'campaign_user',
    where: { campaignId, userId },
  })
  if (existing) {
    return atomService.update({
      table: 'campaign_user',
      where: { id: existing.id },
      data: { state },
    })
  }
  return atomService.create({
    table: 'campaign_user',
    data: { campaignId, userId, state },
  })
}

const createCampaignComment = async (
  campaign: Campaign,
  authorId: string,
  state: (typeof COMMENT_STATE)[keyof typeof COMMENT_STATE] = COMMENT_STATE.active,
  parentCommentId: string | null = null
) => {
  const { id: targetTypeId } = await atomService.findFirst({
    table: 'entity_type',
    where: { table: 'campaign' },
  })
  return atomService.create({
    table: 'comment',
    data: {
      uuid: uuidv4(),
      content: '<p>campaign discussion comment</p>',
      authorId,
      targetId: campaign.id,
      targetTypeId,
      parentCommentId,
      type: COMMENT_TYPE.campaignDiscussion,
      state,
    },
  })
}

describe('put campaignDiscussion comment', () => {
  // existing seeded users with usernames
  const participantId = '2'
  const nonParticipantId = '3'
  const pendingId = '4'
  const rejectedId = '5'
  const creatorId = '1'
  const organizerId = '6'
  const managerId = '7'

  let campaign: Campaign
  let campaignGlobalId: string

  const putCampaignComment = async (userId: string, campaignId: string) => {
    const server = await testClient({ userId, isAuth: true, connections })
    return server.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'test campaign discussion comment',
            campaignId,
            type: 'campaignDiscussion',
          },
        },
      },
    })
  }

  beforeAll(async () => {
    campaign = await campaignService.createWritingChallenge({
      ...baseCampaignData,
      creatorId,
      state: CAMPAIGN_STATE.active,
      organizerIds: [organizerId],
      managerIds: [managerId],
    })
    campaignGlobalId = toGlobalId({
      type: NODE_TYPES.Campaign,
      id: campaign.id,
    })
    await setApplicationState(
      campaign.id,
      participantId,
      CAMPAIGN_USER_STATE.succeeded
    )
    await setApplicationState(
      campaign.id,
      pendingId,
      CAMPAIGN_USER_STATE.pending
    )
    await setApplicationState(
      campaign.id,
      rejectedId,
      CAMPAIGN_USER_STATE.rejected
    )
  })

  test('succeeded participant can comment', async () => {
    const { errors, data } = await putCampaignComment(
      participantId,
      campaignGlobalId
    )
    expect(errors).toBeUndefined()
    expect(data.putComment.id).toBeDefined()
    expect(data.putComment.node.id).toBe(campaignGlobalId)
  })

  test('creator/organizer/manager can comment', async () => {
    for (const userId of [creatorId, organizerId, managerId]) {
      const { errors, data } = await putCampaignComment(
        userId,
        campaignGlobalId
      )
      expect(errors).toBeUndefined()
      expect(data.putComment.id).toBeDefined()
    }
  })

  test('non-participant can not comment', async () => {
    const { errors } = await putCampaignComment(
      nonParticipantId,
      campaignGlobalId
    )
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test('pending applicant can not comment', async () => {
    const { errors } = await putCampaignComment(pendingId, campaignGlobalId)
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test('rejected applicant can not comment', async () => {
    const { errors } = await putCampaignComment(rejectedId, campaignGlobalId)
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test('can not comment on archived campaign', async () => {
    const archivedCampaign = await campaignService.createWritingChallenge({
      ...baseCampaignData,
      creatorId,
      state: CAMPAIGN_STATE.archived,
    })
    await setApplicationState(
      archivedCampaign.id,
      participantId,
      CAMPAIGN_USER_STATE.succeeded
    )
    const { errors } = await putCampaignComment(
      participantId,
      toGlobalId({ type: NODE_TYPES.Campaign, id: archivedCampaign.id })
    )
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN_BY_TARGET_STATE')
  })

  test('finished and pending campaigns accept comments', async () => {
    for (const state of [CAMPAIGN_STATE.finished, CAMPAIGN_STATE.pending]) {
      const c = await campaignService.createWritingChallenge({
        ...baseCampaignData,
        creatorId,
        state,
      })
      await setApplicationState(
        c.id,
        participantId,
        CAMPAIGN_USER_STATE.succeeded
      )
      const { errors, data } = await putCampaignComment(
        participantId,
        toGlobalId({ type: NODE_TYPES.Campaign, id: c.id })
      )
      expect(errors).toBeUndefined()
      expect(data.putComment.id).toBeDefined()
    }
  })
})

describe('vote/unvote campaignDiscussion comment', () => {
  const participantId = '2'
  const nonParticipantId = '3'
  let campaign: Campaign
  let comment: { id: string }

  beforeAll(async () => {
    campaign = await campaignService.createWritingChallenge({
      ...baseCampaignData,
      creatorId: '1',
      state: CAMPAIGN_STATE.active,
    })
    await setApplicationState(
      campaign.id,
      participantId,
      CAMPAIGN_USER_STATE.succeeded
    )
    comment = await createCampaignComment(campaign, participantId)
  })

  test('participant can upvote a campaign discussion comment (no circle fallthrough)', async () => {
    const server = await testClient({
      userId: participantId,
      isAuth: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: VOTE_COMMENT,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
          vote: 'up',
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.voteComment.upvotes).toBe(1)
    expect(data.voteComment.downvotes).toBe(0)

    const upvotes = await commentService.countUpVote(comment.id)
    expect(upvotes).toBe(1)
  })

  test('participant can unvote a campaign discussion comment', async () => {
    const server = await testClient({
      userId: participantId,
      isAuth: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: UNVOTE_COMMENT,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.unvoteComment.upvotes).toBe(0)

    const upvotes = await commentService.countUpVote(comment.id)
    expect(upvotes).toBe(0)
  })

  test('non-participant can not upvote a campaign discussion comment', async () => {
    const server = await testClient({
      userId: nonParticipantId,
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: VOTE_COMMENT,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
          vote: 'up',
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
})

describe('delete campaignDiscussion comment', () => {
  const authorId = '2'
  const otherUserId = '3'
  const creatorId = '1'
  const organizerId = '6'
  const managerId = '7'

  let campaign: Campaign

  const deleteComment = async (userId: string, commentId: string) => {
    const server = await testClient({ userId, isAuth: true, connections })
    return server.executeOperation({
      query: DELETE_COMMENT,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Comment, id: commentId }) },
      },
    })
  }

  beforeAll(async () => {
    campaign = await campaignService.createWritingChallenge({
      ...baseCampaignData,
      creatorId,
      state: CAMPAIGN_STATE.active,
      organizerIds: [organizerId],
      managerIds: [managerId],
    })
    await setApplicationState(
      campaign.id,
      authorId,
      CAMPAIGN_USER_STATE.succeeded
    )
  })

  test('comment author can delete own comment', async () => {
    const comment = await createCampaignComment(campaign, authorId)
    const { errors, data } = await deleteComment(authorId, comment.id)
    expect(errors).toBeUndefined()
    expect(data.deleteComment.state).toBe(COMMENT_STATE.archived)
  })

  test('creator/organizer/manager can delete others comments', async () => {
    for (const userId of [creatorId, organizerId, managerId]) {
      const comment = await createCampaignComment(campaign, authorId)
      const { errors, data } = await deleteComment(userId, comment.id)
      expect(errors).toBeUndefined()
      expect(data.deleteComment.state).toBe(COMMENT_STATE.archived)
    }
  })

  test('unrelated user can not delete others comment', async () => {
    const comment = await createCampaignComment(campaign, authorId)
    const { errors } = await deleteComment(otherUserId, comment.id)
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
})

describe('pin campaignDiscussion comment', () => {
  test('togglePinComment on a campaign discussion comment is forbidden', async () => {
    const campaign = await campaignService.createWritingChallenge({
      ...baseCampaignData,
      creatorId: '1',
      state: CAMPAIGN_STATE.active,
    })
    const comment = await createCampaignComment(campaign, '1')
    const server = await testClient({ userId: '1', isAuth: true, connections })
    const { errors } = await server.executeOperation({
      query: TOGGLE_PIN_COMMENT,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
          enabled: true,
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
})

describe('query campaign discussion list and count', () => {
  const QUERY_DISCUSSION = /* GraphQL */ `
    query ($input: CampaignInput!, $commentsInput: CommentsInput!) {
      campaign(input: $input) {
        id
        ... on WritingChallenge {
          discussionCount
          discussion(input: $commentsInput) {
            totalCount
            edges {
              node {
                id
                state
              }
            }
          }
        }
      }
    }
  `

  const authorId = '2'
  let campaign: Campaign

  beforeAll(async () => {
    campaign = await campaignService.createWritingChallenge({
      ...baseCampaignData,
      creatorId: '1',
      state: CAMPAIGN_STATE.active,
    })
    await setApplicationState(
      campaign.id,
      authorId,
      CAMPAIGN_USER_STATE.succeeded
    )
    // 2 active top-level comments, 1 archived, 1 banned
    await createCampaignComment(campaign, authorId, COMMENT_STATE.active)
    await createCampaignComment(campaign, authorId, COMMENT_STATE.active)
    await createCampaignComment(campaign, authorId, COMMENT_STATE.archived)
    await createCampaignComment(campaign, authorId, COMMENT_STATE.banned)
  })

  test('archived/banned comments are excluded from public list', async () => {
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: QUERY_DISCUSSION,
      variables: {
        input: { shortHash: campaign.shortHash },
        commentsInput: { first: 10 },
      },
    })
    expect(errors).toBeUndefined()
    const states = data.campaign.discussion.edges.map((e: any) => e.node.state)
    expect(states).not.toContain(COMMENT_STATE.archived)
    expect(states).not.toContain(COMMENT_STATE.banned)
    expect(states.length).toBe(2)
  })

  test('discussionCount counts active/collapsed comments', async () => {
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: QUERY_DISCUSSION,
      variables: {
        input: { shortHash: campaign.shortHash },
        commentsInput: { first: 10 },
      },
    })
    expect(errors).toBeUndefined()
    // count is by service.count: active + collapsed only
    expect(data.campaign.discussionCount).toBe(2)
  })
})
