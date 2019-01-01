// local
import { toGlobalId } from 'common/utils'
import { knex } from 'connectors/db'
import { testClient } from './utils'

afterAll(knex.destroy)

const isDesc = (ints: number[]) =>
  ints
    .slice(1)
    .map((e, i) => e <= ints[i])
    .every(x => x)

const ARTICLE_ID = toGlobalId({ type: 'Article', id: 1 })
const COMMENT_ID = toGlobalId({ type: 'Comment', id: 1 })
const GET_ARTILCE_COMMENTS = `
  query($nodeInput: NodeInput!, $commentsInput: CommentsInput!) {
    node(input: $nodeInput) {
      ... on Article {
        id
        comments(input: $commentsInput) {
          quote
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
`
const REPORT_COMMENT = `
  mutation($input: ReportCommentInput!) {
    reportComment(input: $input)
  }
`

describe('query comment list on article', async () => {
  test('query comments by author', async () => {
    const authorId = toGlobalId({ type: 'User', id: 2 })
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTILCE_COMMENTS,
      // @ts-ignore
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: { author: authorId }
      }
    })
    const comments = data && data.node && data.node.comments
    for (const comment of comments) {
      expect(comment.author.id).toBe(authorId)
    }
  })

  test('query quoted comments', async () => {
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTILCE_COMMENTS,
      // @ts-ignore
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: { quote: true }
      }
    })

    const comments = data && data.node && data.node.comments
    for (const comment of comments) {
      expect(comment.quote).toBe(true)
    }
  })

  test('sort comments by upvotes', async () => {
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTILCE_COMMENTS,
      // @ts-ignore
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: { sort: 'upvotes' }
      }
    })

    const comments = data && data.node && data.node.comments

    const commentVotes = comments.map(
      ({ upvotes }: { upvotes: number }) => upvotes
    )
    expect(isDesc(commentVotes)).toBe(true)
  })

  test('sort comments by newest', async () => {
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTILCE_COMMENTS,
      // @ts-ignore
      variables: {
        nodeInput: { id: ARTICLE_ID },
        commentsInput: { sort: 'newest' }
      }
    })
    const comments = data && data.node && data.node.comments

    const commentTimestamps = comments.map(
      ({ createdAt }: { createdAt: string }) => new Date(createdAt).getTime()
    )
    expect(isDesc(commentTimestamps)).toBe(true)
  })
})

describe('Report comment', async () => {
  test('authed user report a comment', async () => {
    const { mutate } = await testClient({ isAuth: true })
    const result = await mutate({
      mutation: REPORT_COMMENT,
      // @ts-ignore
      variables: {
        input: {
          id: COMMENT_ID,
          category: 'spam'
        }
      }
    })
    expect(result.data.reportComment).toBe(true)
  })
})
