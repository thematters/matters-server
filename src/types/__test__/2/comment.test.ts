import { v4 as uuidv4 } from 'uuid'
import type { Connections } from 'definitions'

import _get from 'lodash/get'

import { NODE_TYPES, NOTICE_TYPE, COMMENT_STATE } from 'common/enums'
import {
  AtomService,
  CommentService,
  MomentService,
  UserService,
} from 'connectors'
import { fromGlobalId, toGlobalId } from 'common/utils'

import { testClient, genConnections, closeConnections } from '../utils'

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
    expect(mockTrigger.mock.calls.map((call) => call[0].event)).toEqual([
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
    expect(mockTrigger.mock.calls.map((call) => call[0].event)).toEqual([
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

    expect(mockTrigger.mock.calls.map((call) => call[0].event)).toEqual([
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
