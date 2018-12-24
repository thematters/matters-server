// external
import { graphql } from 'graphql'
// local
import { makeContext, toGlobalId } from 'common/utils'
import { knex } from 'connectors/db'
import schema from '../../schema'

afterAll(knex.destroy)

const isDesc = (ints: number[]) =>
  ints
    .slice(1)
    .map((e, i) => e <= ints[i])
    .every(x => x)

const initialize = async () => {
  const context = await makeContext({ req: {} })
  const articleId = toGlobalId({ type: 'Article', id: 1 })

  const query = `
    query($nodeInput: NodeInput!, $commentsInput: CommentsInput!) {
      node(input: $nodeInput) {
        ... on Article {
          id
          comments(input: $commentsInput) {
            quote
            upvotes
            createdAt
            author {
              id
            }
          }
        }
      }
    }
  `
  return {
    context,
    articleId,
    query
  }
}

describe('query comment list on article', async () => {
  test('query comments by author', async () => {
    const { articleId, context, query } = await initialize()
    const authorId = toGlobalId({ type: 'User', id: 2 })
    const { data } = await graphql(schema, query, {}, context, {
      nodeInput: { id: articleId },
      commentsInput: { author: authorId }
    })
    const comments = data && data.node && data.node.comments
    for (const comment of comments) {
      expect(comment.author.id).toBe(authorId)
    }
  })

  test('query quoted comments', async () => {
    const { articleId, context, query } = await initialize()
    const { data } = await graphql(schema, query, {}, context, {
      nodeInput: { id: articleId },
      commentsInput: { quote: true }
    })
    const comments = data && data.node && data.node.comments
    for (const comment of comments) {
      expect(comment.quote).toBe(true)
    }
  })

  test('sort comments by upvotes', async () => {
    const { articleId, context, query } = await initialize()
    const { data } = await graphql(schema, query, {}, context, {
      nodeInput: { id: articleId },
      commentsInput: { sort: 'upvotes' }
    })
    const comments = data && data.node && data.node.comments

    const commentVotes = comments.map(
      ({ upvotes }: { upvotes: number }) => upvotes
    )
    expect(isDesc(commentVotes)).toBe(true)
  })

  test('sort comments by newest', async () => {
    const { articleId, context, query } = await initialize()
    const { data } = await graphql(schema, query, {}, context, {
      nodeInput: { id: articleId },
      commentsInput: { sort: 'newest' }
    })
    const comments = data && data.node && data.node.comments

    const commentTimestamps = comments.map(
      ({ createdAt }: { createdAt: string }) => new Date(createdAt).getTime()
    )
    expect(isDesc(commentTimestamps)).toBe(true)
  })
})
