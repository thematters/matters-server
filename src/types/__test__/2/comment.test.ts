import { v4 as uuidv4 } from 'uuid'
import type { Connections } from '#definitions/index.js'

import _get from 'lodash/get.js'
import { jest } from '@jest/globals'

import {
  COMMENT_STATE,
  COMMENT_TYPE,
  NODE_TYPES,
  NOTICE_TYPE,
  OFFICIAL_NOTICE_EXTEND_TYPE,
  USER_FEATURE_FLAG_TYPE,
} from '#common/enums/index.js'
import {
  AtomService,
  CommentService,
  MomentService,
  UserService,
} from '#connectors/index.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../utils.js'

let connections: Connections
let atomService: AtomService
let commentService: CommentService
let momentService: MomentService
let userService: UserService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  commentService = new CommentService(connections)
  momentService = new MomentService(connections)
  userService = new UserService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const isDesc = (ints: number[]) =>
  ints
    .slice(1)
    .map((e, i) => e <= ints[i])
    .every((x) => x)

const PUT_COMMENT = /* GraphQL */ `
  mutation ($input: PutCommentInput!) {
    putComment(input: $input) {
      id
      replyTo {
        id
      }
      node {
        ... on Moment {
          shortHash
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

const COMMUNITY_WATCH_REMOVE_COMMENT = /* GraphQL */ `
  mutation ($input: CommunityWatchRemoveCommentInput!) {
    communityWatchRemoveComment(input: $input) {
      state
      communityWatchAction {
        uuid
        reason
        createdAt
      }
    }
  }
`

const COMMUNITY_WATCH_ACTIONS = /* GraphQL */ `
  query ($input: CommunityWatchActionsInput!) {
    communityWatchActions(input: $input) {
      totalCount
      edges {
        cursor
        node {
          uuid
          commentId
          sourceType
          sourceTitle
          sourceId
          actorDisplayName
          reason
          actionState
          appealState
          reviewState
          originalContent
          contentCleared
          createdAt
        }
      }
      pageInfo {
        startCursor
        endCursor
        hasPreviousPage
        hasNextPage
      }
    }
  }
`

const COMMUNITY_WATCH_ACTION = /* GraphQL */ `
  query ($input: CommunityWatchActionInput!) {
    communityWatchAction(input: $input) {
      uuid
      commentId
      sourceType
      sourceTitle
      sourceId
      actorDisplayName
      reason
      actionState
      appealState
      reviewState
      originalContent
      contentCleared
      createdAt
    }
  }
`

describe('query comment list on article', () => {
  const GET_ARTILCE_COMMENTS = /* GraphQL */ `
    query ($nodeInput: NodeInput!, $commentsInput: CommentsInput!) {
      node(input: $nodeInput) {
        ... on Article {
          id
          comments(input: $commentsInput) {
            edges {
              node {
                upvotes
                pinned
                createdAt
                author {
                  id
                }
              }
              cursor
            }
            totalCount
            pageInfo {
              startCursor
              endCursor
              hasPreviousPage
              hasNextPage
            }
          }
        }
      }
    }
  `
  const ARTICLE_ID = toGlobalId({ type: NODE_TYPES.Article, id: 1 })

  test('query comments by author', async () => {
    const authorId = toGlobalId({ type: NODE_TYPES.User, id: 2 })
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_ARTILCE_COMMENTS,
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: { filter: { author: authorId } },
      },
    })
    expect(errors).toBeUndefined()
    const comments = data!.node.comments.edges
    for (const comment of comments) {
      expect(comment.node.author.id).toBe(authorId)
    }
  })

  test('sort comments by newest', async () => {
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_ARTILCE_COMMENTS,
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: { sort: 'newest' },
      },
    })
    expect(errors).toBeUndefined()
    const comments = _get(data, 'node.comments.edges')

    const commentTimestamps = comments.map(
      ({ node: { createdAt } }: { node: { createdAt: string } }) =>
        new Date(createdAt).getTime()
    )
    expect(isDesc(commentTimestamps)).toBe(true)
  })

  test('pagination', async () => {
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
        parentCommentId: null,
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
        parentCommentId: null,
        state: 'collapsed',
        uuid: uuidv4(),
        authorId: '1',
      },
    })
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_ARTILCE_COMMENTS,
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: { first: 1 },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.node.comments.edges.length).toBe(1)
    expect(data.node.comments.pageInfo.hasPreviousPage).toBe(false)
    expect(data.node.comments.pageInfo.hasNextPage).toBe(true)
    expect(data.node.comments.totalCount).toBeGreaterThan(1)

    const { errors: errors2, data: data2 } = await server.executeOperation({
      query: GET_ARTILCE_COMMENTS,
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: {
          first: 1,
          after: data.node.comments.pageInfo.endCursor,
        },
      },
    })
    expect(errors2).toBeUndefined()
    expect(data2.node.comments.pageInfo.hasPreviousPage).toBe(true)
    expect(data2.node.comments.pageInfo.hasNextPage).toBe(true)
    expect(data.node.comments.totalCount).toBeGreaterThan(1)
  })
})

describe('put commment', () => {
  const commentId = '1'
  const commentGlobalId = toGlobalId({
    type: NODE_TYPES.Comment,
    id: commentId,
  })
  const articleGlobalId2 = toGlobalId({ type: NODE_TYPES.Article, id: 2 })
  test('user w/o username can not comment', async () => {
    const server = await testClient({ noUserName: true, connections })
    const { errors } = await server.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'test',
            parentId: commentGlobalId,
            replyTo: commentGlobalId,
            articleId: articleGlobalId2,
            type: 'article',
          },
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
  test('create a article comment', async () => {
    const mockTrigger = jest.fn()
    const server = await testClient({
      isAuth: true,
      connections,
      dataSources: { notificationService: { trigger: mockTrigger } },
    })

    const { errors, data } = await server.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'test',
            parentId: commentGlobalId,
            replyTo: commentGlobalId,
            articleId: articleGlobalId2,
            type: 'article',
          },
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putComment.replyTo.id).toBe(commentGlobalId)
    const id = fromGlobalId(data.putComment.id).id
    const comment = await atomService.findUnique({
      table: 'comment',
      where: { id },
    })
    expect(comment.articleVersionId).not.toBeNull()

    // check notification
    expect(mockTrigger.mock.calls.map((call: any) => call[0].event)).toEqual([
      NOTICE_TYPE.article_new_comment,
      NOTICE_TYPE.comment_new_reply,
    ])
  })
  test('no comment_new_reply notice when parent commment is not active', async () => {
    const mockTrigger = jest.fn()
    const server = await testClient({
      isAuth: true,
      connections,
      dataSources: { notificationService: { trigger: mockTrigger } },
    })

    await atomService.update({
      table: 'comment',
      where: { id: commentId },
      data: { state: COMMENT_STATE.archived },
    })

    await server.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'test',
            parentId: commentGlobalId,
            replyTo: commentGlobalId,
            articleId: articleGlobalId2,
            type: 'article',
          },
        },
      },
    })
    expect(mockTrigger.mock.calls.map((call: any) => call[0].event)).toEqual([
      NOTICE_TYPE.article_new_comment,
    ])
  })

  test('create a moment comment', async () => {
    const mockTrigger = jest.fn()
    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      { id: '1', state: 'active', userName: 'test' }
    )
    const momentGlobalId = toGlobalId({
      type: NODE_TYPES.Moment,
      id: moment.id,
    })
    const server = await testClient({
      isAuth: true,
      connections,
      dataSources: {
        notificationService: { trigger: mockTrigger, withdraw: jest.fn() },
      },
    })
    const { errors, data } = await server.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: `<p><a class="mention" href="/@test1" data-id="${toGlobalId(
              { type: NODE_TYPES.User, id: '2' }
            )}" data-user-name="testuser" data-display-name="testuser" rel="noopener noreferrer nofollow"><span>@testuser</span></a></p>`,
            momentId: momentGlobalId,
            type: 'moment',
          },
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putComment.id).toBeDefined()
    expect(data.putComment.node.shortHash).toBe(moment.shortHash)

    expect(mockTrigger.mock.calls.map((call: any) => call[0].event)).toEqual([
      NOTICE_TYPE.moment_new_comment,
      NOTICE_TYPE.moment_comment_mentioned_you,
    ])

    const { errors: errors2, data: data2 } = await server.executeOperation({
      query: DELETE_COMMENT,
      variables: {
        input: {
          id: data.putComment.id,
        },
      },
    })
    expect(errors2).toBeUndefined()
    expect(data2.deleteComment.state).toBe('archived')
  })

  test("blockees can not comment on blockers' articles", async () => {
    const article = await atomService.articleIdLoader.load('1')
    const articleAuthorId = article.authorId
    const blockeeId = '7'
    await userService.block(articleAuthorId, blockeeId)

    const server = await testClient({
      userId: blockeeId,
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'test',
            articleId: toGlobalId({ type: NODE_TYPES.Article, id: article.id }),
            type: 'article',
          },
        },
      },
    })
    expect(errors[0].extensions.code).toBe('FORBIDDEN')

    // comment on other user's article and mention blocker
    const article2 = await atomService.articleIdLoader.load('2')
    expect(article2.authorId).not.toBe(blockeeId)
    expect(article2.authorId).not.toBe(articleAuthorId)

    const { errors: errors2 } = await server.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: `<p><a class="mention" href="/@test1" data-id="${toGlobalId(
              { type: NODE_TYPES.User, id: articleAuthorId }
            )}" data-user-name="testuser" data-display-name="testuser" rel="noopener noreferrer nofollow"><span>@testuser</span></a></p>`,
            articleId: toGlobalId({
              type: NODE_TYPES.Article,
              id: article2.id,
            }),
            type: 'article',
          },
        },
      },
    })
    expect(errors2).toBeUndefined()
  })
})

describe('vote/unvote commment', () => {
  const VOTE_COMMENT = /* GraphQL */ `
    mutation ($input: VoteCommentInput!) {
      voteComment(input: $input) {
        upvotes
        downvotes
      }
    }
  `

  const UNVOTE_COMMENT = /* GraphQL */ `
    mutation ($input: UnvoteCommentInput!) {
      unvoteComment(input: $input) {
        upvotes
        downvotes
      }
    }
  `
  test('upvote a comment', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: VOTE_COMMENT,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: '3' }),
          vote: 'up',
        },
      },
    })
    expect(data.voteComment.upvotes).toBe(1)
  })

  test('unvote a comment', async () => {
    const comment = await atomService.commentIdLoader.load('1')
    const voter = await userService.create({ userName: 'voter' })
    await commentService.upvote({ comment, user: voter })
    const upvotes = await commentService.countUpVote(comment.id)

    const server = await testClient({
      userId: voter.id,
      isAuth: true,
      connections,
    })
    const { data: unvoteData } = await server.executeOperation({
      query: UNVOTE_COMMENT,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }) },
      },
    })
    expect(unvoteData.unvoteComment.upvotes).toBe(upvotes - 1)
  })
})

describe('delete commment', () => {
  test('delete comment by commment author', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: DELETE_COMMENT,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Comment, id: 1 }) },
      },
    })
    expect(data.deleteComment.state).toBe('archived')
  })
  test('delete comment by target moment author', async () => {
    const momentAuthorId = '1'
    const commentAuthorId = '2'

    const moment = await momentService.create(
      { content: 'test', assetIds: [] },
      { id: momentAuthorId, state: 'active', userName: 'test' }
    )

    const serverCommentAuthor = await testClient({
      userId: commentAuthorId,
      isAuth: true,
      connections,
    })
    const { errors, data } = await serverCommentAuthor.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'test moment comment',
            momentId: toGlobalId({ type: NODE_TYPES.Moment, id: moment.id }),
            type: 'moment',
          },
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putComment.id).toBeDefined()
    expect(data.putComment.node.shortHash).toBe(moment.shortHash)

    const serverMomentAuthor = await testClient({
      userId: momentAuthorId,
      isAuth: true,
      connections,
    })
    const { data: dataDeleted } = await serverMomentAuthor.executeOperation({
      query: DELETE_COMMENT,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Comment, id: 1 }) },
      },
    })
    expect(dataDeleted.deleteComment.state).toBe('archived')
  })
})

describe('community watch remove comment', () => {
  test('remove an article comment and write audit evidence', async () => {
    const watcher = await userService.create({
      userName: `watcher${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    })
    await atomService.create({
      table: 'user_feature_flag',
      data: {
        userId: watcher.id,
        type: USER_FEATURE_FLAG_TYPE.communityWatch,
      },
    })

    const article = await atomService.articleIdLoader.load('1')
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })
    const comment = await atomService.create({
      table: 'comment',
      data: {
        uuid: uuidv4(),
        content: '<p>spam ad</p>',
        authorId: '2',
        targetId: article.id,
        targetTypeId,
        parentCommentId: null,
        type: COMMENT_TYPE.article,
        state: COMMENT_STATE.active,
      },
    })
    const mockTrigger = jest.fn()
    const server = await testClient({
      userId: watcher.id,
      isAuth: true,
      connections,
      dataSources: { notificationService: { trigger: mockTrigger } },
    })

    const { errors, data } = await server.executeOperation({
      query: COMMUNITY_WATCH_REMOVE_COMMENT,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: comment.id }),
          reason: 'spam_ad',
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.communityWatchRemoveComment.state).toBe(COMMENT_STATE.banned)
    expect(data.communityWatchRemoveComment.communityWatchAction).toEqual({
      uuid: expect.any(String),
      reason: 'spam_ad',
      createdAt: expect.anything(),
    })

    const auditAction = await atomService.findFirst({
      table: 'community_watch_action',
      where: { commentId: comment.id },
    })
    expect(data.communityWatchRemoveComment.communityWatchAction.uuid).toBe(
      auditAction.uuid
    )
    expect(auditAction).toMatchObject({
      commentId: comment.id,
      commentType: COMMENT_TYPE.article,
      targetType: COMMENT_TYPE.article,
      targetId: article.id,
      targetShortHash: article.shortHash,
      reason: 'spam_ad',
      actorId: watcher.id,
      commentAuthorId: '2',
      originalContent: '<p>spam ad</p>',
      originalState: COMMENT_STATE.active,
      actionState: 'active',
      appealState: 'none',
      reviewState: 'pending',
    })
    expect(auditAction.contentExpiresAt).toBeNull()
    expect(mockTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        event: OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned,
        recipientId: '2',
      })
    )
  })
})

describe('community watch public audit queries', () => {
  const contentExpiresAt = new Date('2026-05-17T00:00:00.000Z')

  test('query audit list with filters', async () => {
    const actor = await userService.create({
      userName: `watcher${uuidv4().replace(/-/g, '').slice(0, 12)}`,
      displayName: 'Community Watcher',
    })
    const article = await atomService.articleIdLoader.load('1')
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'article' },
    })
    const comment = await atomService.create({
      table: 'comment',
      data: {
        uuid: uuidv4(),
        content: '<p>spam ad</p>',
        authorId: '2',
        targetId: article.id,
        targetTypeId,
        parentCommentId: null,
        type: COMMENT_TYPE.article,
        state: COMMENT_STATE.banned,
      },
    })
    const uuid = uuidv4()
    await connections.knex('community_watch_action').insert({
      uuid,
      commentId: comment.id,
      commentType: COMMENT_TYPE.article,
      targetType: COMMENT_TYPE.article,
      targetId: article.id,
      targetTitle: 'Public API article',
      targetShortHash: article.shortHash,
      reason: 'porn_ad',
      actorId: actor.id,
      commentAuthorId: '2',
      originalContent: '<p>spam ad</p>',
      originalState: COMMENT_STATE.active,
      actionState: 'active',
      appealState: 'received',
      reviewState: 'upheld',
      contentExpiresAt,
    })

    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: COMMUNITY_WATCH_ACTIONS,
      variables: {
        input: {
          first: 5,
          reason: 'porn_ad',
          actionState: 'active',
          appealState: 'received',
          reviewState: 'upheld',
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.communityWatchActions.totalCount).toBe(1)
    expect(data.communityWatchActions.pageInfo).toMatchObject({
      hasPreviousPage: false,
      hasNextPage: false,
    })

    const node = data.communityWatchActions.edges[0].node
    expect(node).toMatchObject({
      uuid,
      sourceType: COMMENT_TYPE.article,
      sourceTitle: 'Public API article',
      actorDisplayName: actor.displayName,
      reason: 'porn_ad',
      actionState: 'active',
      appealState: 'received',
      reviewState: 'upheld',
      originalContent: '<p>spam ad</p>',
      contentCleared: false,
      createdAt: expect.anything(),
    })
    expect(fromGlobalId(node.commentId)).toEqual({
      type: NODE_TYPES.Comment,
      id: `${comment.id}`,
    })
    expect(fromGlobalId(node.sourceId)).toEqual({
      type: NODE_TYPES.Article,
      id: `${article.id}`,
    })
  })

  test('query one audit record with cleared content', async () => {
    const actor = await userService.create({
      userName: `watcher${uuidv4().replace(/-/g, '').slice(0, 12)}`,
    })
    const { id: targetTypeId } = await atomService.findFirst({
      table: 'entity_type',
      where: { table: 'moment' },
    })
    const comment = await atomService.create({
      table: 'comment',
      data: {
        uuid: uuidv4(),
        content: '<p>spam ad</p>',
        authorId: '2',
        targetId: '1',
        targetTypeId,
        parentCommentId: null,
        type: COMMENT_TYPE.moment,
        state: COMMENT_STATE.banned,
      },
    })
    const uuid = uuidv4()
    await connections.knex('community_watch_action').insert({
      uuid,
      commentId: comment.id,
      commentType: COMMENT_TYPE.moment,
      targetType: COMMENT_TYPE.moment,
      targetId: '1',
      targetTitle: null,
      targetShortHash: null,
      reason: 'spam_ad',
      actorId: actor.id,
      commentAuthorId: '2',
      originalContent: null,
      originalState: COMMENT_STATE.active,
      actionState: 'restored',
      appealState: 'resolved',
      reviewState: 'reversed',
      contentExpiresAt,
    })

    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: COMMUNITY_WATCH_ACTION,
      variables: {
        input: { uuid },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.communityWatchAction).toMatchObject({
      uuid,
      sourceType: COMMENT_TYPE.moment,
      sourceTitle: '1',
      actorDisplayName: actor.userName,
      reason: 'spam_ad',
      actionState: 'restored',
      appealState: 'resolved',
      reviewState: 'reversed',
      originalContent: null,
      contentCleared: true,
      createdAt: expect.anything(),
    })
    expect(fromGlobalId(data.communityWatchAction.commentId)).toEqual({
      type: NODE_TYPES.Comment,
      id: `${comment.id}`,
    })
    expect(fromGlobalId(data.communityWatchAction.sourceId)).toEqual({
      type: NODE_TYPES.Moment,
      id: '1',
    })
  })
})

describe('pin commment', () => {
  const TOGGLE_PIN_COMMENT = /* GraphQL */ `
    mutation ($input: ToggleItemInput!) {
      togglePinComment(input: $input) {
        id
        pinned
      }
    }
  `
  test('pin a comment', async () => {
    const user1Id = '1'
    const user2Id = '2'
    const user1Article = await atomService.findFirst({
      table: 'article',
      where: { authorId: user1Id },
    })
    const user2Article = await atomService.findFirst({
      table: 'article',
      where: { authorId: user2Id },
    })
    const server = await testClient({ connections, userId: user1Id })

    // can not pin other user's comment
    const { id: othersCommentUnderOwnedArticle } = await atomService.create({
      table: 'comment',
      data: {
        uuid: uuidv4(),
        content: 'my comment',
        authorId: user2Id,
        targetId: user1Article.id,
        targetTypeId: '4',
        parentCommentId: null,
        type: 'article',
      },
    })
    const { errors: errors1 } = await server.executeOperation({
      query: TOGGLE_PIN_COMMENT,
      variables: {
        input: {
          id: toGlobalId({
            type: NODE_TYPES.Comment,
            id: othersCommentUnderOwnedArticle,
          }),
          enabled: true,
        },
      },
    })
    expect(errors1?.[0].extensions.code).toBe('FORBIDDEN')

    // can not pin user's comment under other user's article
    const { id: ownedCommentUnderOthersArticle } = await atomService.create({
      table: 'comment',
      data: {
        uuid: uuidv4(),
        content: 'my comment',
        authorId: user1Id,
        targetId: user2Article.id,
        targetTypeId: '4',
        parentCommentId: null,
        type: 'article',
      },
    })
    const { errors: errors2 } = await server.executeOperation({
      query: TOGGLE_PIN_COMMENT,
      variables: {
        input: {
          id: toGlobalId({
            type: NODE_TYPES.Comment,
            id: ownedCommentUnderOthersArticle,
          }),
          enabled: true,
        },
      },
    })
    expect(errors2?.[0].extensions.code).toBe('FORBIDDEN')

    // can pin user's comment under user's article
    const { id: ownedCommentUnderOwnedArticle } = await atomService.create({
      table: 'comment',
      data: {
        uuid: uuidv4(),
        content: 'my comment',
        authorId: user1Id,
        targetId: user1Article.id,
        targetTypeId: '4',
        parentCommentId: null,
        type: 'article',
      },
    })
    const { data } = await server.executeOperation({
      query: TOGGLE_PIN_COMMENT,
      variables: {
        input: {
          id: toGlobalId({
            type: NODE_TYPES.Comment,
            id: ownedCommentUnderOwnedArticle,
          }),
          enabled: true,
        },
      },
    })
    expect(data.togglePinComment.pinned).toBe(true)

    // can only pin one comment
    const { id: ownedCommentUnderOwnedArticle2 } = await atomService.create({
      table: 'comment',
      data: {
        uuid: uuidv4(),
        content: 'my comment',
        authorId: user1Id,
        targetId: user1Article.id,
        targetTypeId: '4',
        parentCommentId: null,
        type: 'article',
      },
    })
    const { errors: errors3 } = await server.executeOperation({
      query: TOGGLE_PIN_COMMENT,
      variables: {
        input: {
          id: toGlobalId({
            type: NODE_TYPES.Comment,
            id: ownedCommentUnderOwnedArticle2,
          }),
          enabled: true,
        },
      },
    })
    expect(errors3?.[0].extensions.code).toBe('ACTION_LIMIT_EXCEEDED')
  })

  test('unpin a comment ', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: TOGGLE_PIN_COMMENT,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Comment, id: 1 }),
          enabled: false,
        },
      },
    })
    expect(_get(data, 'togglePinComment.pinned')).toBe(false)
  })
})

describe('query responses list on article', () => {
  const GET_ARTILCE_RESPONSES = /* GraphQL */ `
    query ($nodeInput: NodeInput!, $responsesInput: ResponsesInput!) {
      node(input: $nodeInput) {
        ... on Article {
          id
          responses(input: $responsesInput) {
            edges {
              node {
                __typename
                ... on Comment {
                  id
                  content
                  state
                }
                ... on Article {
                  id
                  title
                }
              }
            }
            totalCount
            pageInfo {
              startCursor
              endCursor
              hasPreviousPage
              hasNextPage
            }
          }
        }
      }
    }
  `
  test('query responses', async () => {
    const ARTICLE_ID = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: GET_ARTILCE_RESPONSES,
      variables: {
        nodeInput: { id: ARTICLE_ID },
        responsesInput: {},
      },
    })
    expect(data).toBeDefined()
    expect(errors).toBeUndefined()
  })
  test('query empty responses', async () => {
    const articleId = toGlobalId({ type: NODE_TYPES.Article, id: 4 })
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: GET_ARTILCE_RESPONSES,
      variables: {
        nodeInput: { id: articleId },
        responsesInput: {},
      },
    })
    expect(data).toBeDefined()
    expect(errors).toBeUndefined()
  })
})
