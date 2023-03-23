import _get from 'lodash/get.js'

import { NODE_TYPES } from 'common/enums/index.js'
import { toGlobalId } from 'common/utils/index.js'
import { GQLCommentType } from 'definitions'

import { testClient } from './utils.js'

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
        upvotes
        downvotes
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
  const server = await testClient()
  const { data } = await server.executeOperation({
    query: GET_COMMENT,
    variables: {
      input: { id: commentId },
    },
  })
  return data && data.node
}

describe('query comment list on article', () => {
  test('query comments by author', async () => {
    const authorId = toGlobalId({ type: NODE_TYPES.User, id: 2 })
    const server = await testClient()
    const result = await server.executeOperation({
      query: GET_ARTILCE_COMMENTS,
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: { filter: { author: authorId } },
      },
    })
    const comments = _get(result, 'data.node.comments.edges')
    for (const comment of comments) {
      expect(comment.node.author.id).toBe(authorId)
    }
  })

  test('sort comments by newest', async () => {
    const server = await testClient()
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

  test('create a article comment', async () => {
    const server = await testClient({ isAuth: true })

    const result = await server.executeOperation({
      query: PUT_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'test',
            parentId: COMMENT_ID,
            replyTo: COMMENT_ID,
            articleId: ARTICLE_2_ID,
            type: GQLCommentType.article,
          },
        },
      },
    })

    expect(_get(result, 'data.putComment.replyTo.id')).toBe(COMMENT_ID)
  })

  test('upvote a comment', async () => {
    const server = await testClient({ isAuth: true })
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

  test('onboarding user vote a comment', async () => {
    const onboardingCommentId = toGlobalId({ type: NODE_TYPES.Comment, id: 6 })
    const server = await testClient({
      isAuth: true,
      isOnboarding: true,
    })

    // upvote
    const upvoteResult = await server.executeOperation({
      query: VOTE_COMMENT,
      variables: {
        input: { id: commentId, vote: 'up' },
      },
    })
    expect(_get(upvoteResult, 'errors.0.extensions.code')).toBe(
      'FORBIDDEN_BY_STATE'
    )

    // upvote comment that article published by viewer
    const upvoteSuccuessResult = await server.executeOperation({
      query: VOTE_COMMENT,
      variables: {
        input: { id: onboardingCommentId, vote: 'up' },
      },
    })
    expect(_get(upvoteSuccuessResult, 'data.voteComment.upvotes')).toBeDefined()

    // downvote
    const downvoteResult = await server.executeOperation({
      query: VOTE_COMMENT,
      variables: {
        input: { id: commentId, vote: 'down' },
      },
    })
    expect(_get(downvoteResult, 'errors.0.extensions.code')).toBe(
      'FORBIDDEN_BY_STATE'
    )

    // downvote comment that article published by viewer
    const downvoteSuccuessResult = await server.executeOperation({
      query: VOTE_COMMENT,
      variables: {
        input: { id: onboardingCommentId, vote: 'up' },
      },
    })
    expect(
      _get(downvoteSuccuessResult, 'data.voteComment.downvotes')
    ).toBeDefined()
  })

  test('downvote a comment', async () => {
    const server = await testClient({ isAuth: true })
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
    const server = await testClient({ isAuth: true })
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
    const server = await testClient({ isAuth: true })
    const { data } = await server.executeOperation({
      query: DELETE_COMMENT,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Comment, id: 1 }) },
      },
    })
    expect(_get(data, 'deleteComment.state')).toBe('archived')
  })

  test('pin a comment', async () => {
    const server = await testClient({ isAuth: true })
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
    const server = await testClient({ isAuth: true })
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
