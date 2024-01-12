import type { Connections } from 'definitions'

import _get from 'lodash/get'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import { testClient, genConnections, closeConnections } from '../utils'

let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const isDesc = (ints: number[]) =>
  ints
    .slice(1)
    .map((e, i) => e <= ints[i])
    .every((x) => x)

const ARTICLE_ID = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
const ARTICLE_2_ID = toGlobalId({ type: NODE_TYPES.Article, id: 2 })
const COMMENT_ID = toGlobalId({ type: NODE_TYPES.Comment, id: 1 })

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
          }
        }
      }
    }
  }
`

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

const DELETE_COMMENT = /* GraphQL */ `
  mutation ($input: DeleteCommentInput!) {
    deleteComment(input: $input) {
      state
    }
  }
`

const GET_COMMENT = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Comment {
        state
        type
        createdAt
        content
        author {
          id
        }
        pinned
        upvotes
        downvotes
        myVote
        replyTo {
          id
        }
      }
    }
  }
`

const PUT_COMMENT = /* GraphQL */ `
  mutation ($input: PutCommentInput!) {
    putComment(input: $input) {
      replyTo {
        id
      }
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

const getCommentVotes = async (commentId: string) => {
  const server = await testClient({ connections })
  const { data } = await server.executeOperation({
    query: GET_COMMENT,
    variables: {
      input: { id: commentId },
    },
  })
  return data && data.node
}

describe('query comment', () => {
  test('query comment by id', async () => {
    const server = await testClient({ connections })
    const {
      data: { node },
      errors,
    } = await server.executeOperation({
      query: GET_COMMENT,
      variables: {
        input: { id: COMMENT_ID },
      },
    })
    expect(node.state).toBe('active')
    expect(node.type).toBe('article')
    expect(node.createdAt.toString()).not.toBe(new Date(0).toString())
    expect(node.content).not.toBe('')
    expect(node.author).not.toBeNull()
    expect(errors).toBeUndefined()
  })
  test('query archived comment', async () => {
    await connections
      .knex('comment')
      .where({ id: 1 })
      .update({ state: 'archived' })
    const server = await testClient({ connections })
    const {
      data: { node },
      errors,
    } = await server.executeOperation({
      query: GET_COMMENT,
      variables: {
        input: { id: COMMENT_ID },
      },
    })
    expect(node.state).toBe('archived')
    expect(node.type).toBe('article')
    expect(node.createdAt.toString()).toBe(new Date(0).toString())
    expect(node.content).toBe('')
    expect(node.author).toBeNull()
    expect(node.pinned).toBe(false)
    expect(node.upvotes).toBe(0)
    expect(node.downvotes).toBe(0)
    expect(node.replyTo).toBeNull()
    expect(errors).toBeUndefined()

    await connections
      .knex('comment')
      .where({ id: 1 })
      .update({ state: 'active' })
  })
})

describe('query comment list on article', () => {
  test('query comments by author', async () => {
    const authorId = toGlobalId({ type: NODE_TYPES.User, id: 2 })
    const server = await testClient({ connections })
    const result = await server.executeOperation({
      query: GET_ARTILCE_COMMENTS,
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: { filter: { author: authorId } },
      },
    })
    const comments = result!.data!.node.comments.edges
    for (const comment of comments) {
      expect(comment.node.author.id).toBe(authorId)
    }
  })

  test('sort comments by newest', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: GET_ARTILCE_COMMENTS,
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: { sort: 'newest' },
      },
    })
    const comments = _get(data, 'node.comments.edges')

    const commentTimestamps = comments.map(
      ({ node: { createdAt } }: { node: { createdAt: string } }) =>
        new Date(createdAt).getTime()
    )
    expect(isDesc(commentTimestamps)).toBe(true)
  })
})

describe('mutations on comment', () => {
  const commentId = toGlobalId({ type: NODE_TYPES.Comment, id: 3 })

  test('user w/o username can not comment', async () => {
    const server = await testClient({ noUserName: true, connections })
    const { errors } = await server.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'test',
            parentId: COMMENT_ID,
            replyTo: COMMENT_ID,
            articleId: ARTICLE_2_ID,
            type: 'article',
          },
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
  test('create a article comment', async () => {
    const server = await testClient({ isAuth: true, connections })

    const result = await server.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'test',
            parentId: COMMENT_ID,
            replyTo: COMMENT_ID,
            articleId: ARTICLE_2_ID,
            type: 'article',
          },
        },
      },
    })

    expect(_get(result, 'data.putComment.replyTo.id')).toBe(COMMENT_ID)
  })

  test('upvote a comment', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { upvotes } = await getCommentVotes(commentId)

    // upvote
    const { data } = await server.executeOperation({
      query: VOTE_COMMENT,
      variables: {
        input: { id: commentId, vote: 'up' },
      },
    })
    expect(_get(data, 'voteComment.upvotes')).toBe(upvotes + 1)
  })

  test('downvote a comment', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { upvotes } = await getCommentVotes(commentId)
    const { data: downvoteData } = await server.executeOperation({
      query: VOTE_COMMENT,
      variables: {
        input: { id: commentId, vote: 'down' },
      },
    })
    expect(_get(downvoteData, 'voteComment.upvotes')).toBe(upvotes - 1)
    expect(_get(downvoteData, 'voteComment.downvotes')).toBe(0)
  })

  test('unvote a comment', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { upvotes } = await getCommentVotes(commentId)
    const { data: unvoteData } = await server.executeOperation({
      query: UNVOTE_COMMENT,
      variables: {
        input: { id: commentId },
      },
    })
    expect(_get(unvoteData, 'unvoteComment.upvotes')).toBe(upvotes)
    expect(_get(unvoteData, 'unvoteComment.downvotes')).toBe(0)
  })

  test('delete comment', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: DELETE_COMMENT,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Comment, id: 1 }) },
      },
    })
    expect(_get(data, 'deleteComment.state')).toBe('archived')
  })

  test('pin a comment', async () => {
    const server = await testClient({ isAuth: true, connections })
    const result = await server.executeOperation({
      query: TOGGLE_PIN_COMMENT,
      variables: {
        input: {
          id: COMMENT_ID,
          enabled: true,
        },
      },
    })
    expect(_get(result.data, 'togglePinComment.pinned')).toBe(true)
  })

  test('unpin a comment ', async () => {
    const server = await testClient({ isAuth: true, connections })
    const { data } = await server.executeOperation({
      query: TOGGLE_PIN_COMMENT,
      variables: {
        input: {
          id: COMMENT_ID,
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
