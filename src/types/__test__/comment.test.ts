import _get from 'lodash/get'

import { toGlobalId } from 'common/utils'
import { GQLCommentType } from 'definitions'

import { testClient } from './utils'

const isDesc = (ints: number[]) =>
  ints
    .slice(1)
    .map((e, i) => e <= ints[i])
    .every((x) => x)

const ARTICLE_ID = toGlobalId({ type: 'Article', id: 1 })
const COMMENT_ID = toGlobalId({ type: 'Comment', id: 1 })

const GET_ARTILCE_COMMENTS = /* GraphQL */ `
  query($nodeInput: NodeInput!, $commentsInput: CommentsInput!) {
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
  mutation($input: VoteCommentInput!) {
    voteComment(input: $input) {
      upvotes
      downvotes
    }
  }
`

const UNVOTE_COMMENT = /* GraphQL */ `
  mutation($input: UnvoteCommentInput!) {
    unvoteComment(input: $input) {
      upvotes
      downvotes
    }
  }
`

const DELETE_COMMENT = /* GraphQL */ `
  mutation($input: DeleteCommentInput!) {
    deleteComment(input: $input) {
      state
    }
  }
`

const GET_COMMENT = /* GraphQL */ `
  query($input: NodeInput!) {
    node(input: $input) {
      ... on Comment {
        upvotes
        downvotes
      }
    }
  }
`

const PUT_COMMENT = /* GraphQL */ `
  mutation($input: PutCommentInput!) {
    putComment(input: $input) {
      replyTo {
        id
      }
    }
  }
`

const TOGGLE_PIN_COMMENT = /* GraphQL */ `
  mutation($input: ToggleItemInput!) {
    togglePinComment(input: $input) {
      id
      pinned
    }
  }
`

const getCommentVotes = async (commentId: string) => {
  const { query } = await testClient()
  const { data } = await query({
    query: GET_COMMENT,
    // @ts-ignore
    variables: {
      input: { id: commentId },
    },
  })
  return data && data.node
}

describe('query comment list on article', () => {
  test('query comments by author', async () => {
    const authorId = toGlobalId({ type: 'User', id: 2 })
    const { query } = await testClient()
    const result = await query({
      query: GET_ARTILCE_COMMENTS,
      // @ts-ignore
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
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTILCE_COMMENTS,
      // @ts-ignore
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
  const commentId = toGlobalId({ type: 'Comment', id: 3 })

  test('create a article comment', async () => {
    const { mutate } = await testClient({ isAuth: true })

    const result = await mutate({
      mutation: PUT_COMMENT,
      // @ts-ignore
      variables: {
        input: {
          comment: {
            content: 'test',
            parentId: COMMENT_ID,
            replyTo: COMMENT_ID,
            articleId: ARTICLE_ID,
            type: GQLCommentType.article,
          },
        },
      },
    })

    expect(_get(result, 'data.putComment.replyTo.id')).toBe(COMMENT_ID)
  })

  test('upvote a comment', async () => {
    const { mutate } = await testClient({ isAuth: true })
    const { upvotes, downvotes } = await getCommentVotes(commentId)

    // upvote
    const { data } = await mutate({
      mutation: VOTE_COMMENT,
      // @ts-ignore
      variables: {
        input: { id: commentId, vote: 'up' },
      },
    })
    expect(_get(data, 'voteComment.upvotes')).toBe(upvotes + 1)
  })

  test('onboarding user vote a comment', async () => {
    const onboardingCommentId = toGlobalId({ type: 'Comment', id: 6 })
    const { mutate } = await testClient({ isAuth: true, isOnboarding: true })

    // upvote
    const upvoteResult = await mutate({
      mutation: VOTE_COMMENT,
      // @ts-ignore
      variables: {
        input: { id: commentId, vote: 'up' },
      },
    })
    expect(_get(upvoteResult, 'errors.0.extensions.code')).toBe(
      'FORBIDDEN_BY_STATE'
    )

    // upvote comment that article published by viewer
    const upvoteSuccuessResult = await mutate({
      mutation: VOTE_COMMENT,
      // @ts-ignore
      variables: {
        input: { id: onboardingCommentId, vote: 'up' },
      },
    })
    expect(_get(upvoteSuccuessResult, 'data.voteComment.upvotes')).toBeDefined()

    // downvote
    const downvoteResult = await mutate({
      mutation: VOTE_COMMENT,
      // @ts-ignore
      variables: {
        input: { id: commentId, vote: 'down' },
      },
    })
    expect(_get(downvoteResult, 'errors.0.extensions.code')).toBe(
      'FORBIDDEN_BY_STATE'
    )

    // downvote comment that article published by viewer
    const downvoteSuccuessResult = await mutate({
      mutation: VOTE_COMMENT,
      // @ts-ignore
      variables: {
        input: { id: onboardingCommentId, vote: 'up' },
      },
    })
    expect(
      _get(downvoteSuccuessResult, 'data.voteComment.downvotes')
    ).toBeDefined()
  })

  test('downvote a comment', async () => {
    const { mutate } = await testClient({ isAuth: true })
    const { upvotes, downvotes } = await getCommentVotes(commentId)
    const { data: downvoteData } = await mutate({
      mutation: VOTE_COMMENT,
      // @ts-ignore
      variables: {
        input: { id: commentId, vote: 'down' },
      },
    })
    expect(_get(downvoteData, 'voteComment.upvotes')).toBe(upvotes - 1)
    expect(_get(downvoteData, 'voteComment.downvotes')).toBe(downvotes + 1)
  })

  test('unvote a comment', async () => {
    const { mutate } = await testClient({ isAuth: true })
    const { upvotes, downvotes } = await getCommentVotes(commentId)
    const { data: unvoteData } = await mutate({
      mutation: UNVOTE_COMMENT,
      // @ts-ignore
      variables: {
        input: { id: commentId },
      },
    })
    expect(_get(unvoteData, 'unvoteComment.upvotes')).toBe(upvotes)
    expect(_get(unvoteData, 'unvoteComment.downvotes')).toBe(downvotes - 1)
  })

  test('delete comment', async () => {
    const { mutate } = await testClient({ isAuth: true })
    const { data } = await mutate({
      mutation: DELETE_COMMENT,
      // @ts-ignore
      variables: {
        input: { id: toGlobalId({ type: 'Comment', id: 1 }) },
      },
    })
    expect(_get(data, 'deleteComment.state')).toBe('archived')
  })

  test('pin a comment', async () => {
    const { mutate } = await testClient({ isAuth: true })
    const result = await mutate({
      mutation: TOGGLE_PIN_COMMENT,
      // @ts-ignore
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
    const { mutate } = await testClient({ isAuth: true })
    const { data } = await mutate({
      mutation: TOGGLE_PIN_COMMENT,
      // @ts-ignore
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
