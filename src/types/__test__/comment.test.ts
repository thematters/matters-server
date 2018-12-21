// external
import { graphql } from 'graphql'
// local
import { makeContext, toGlobalId } from 'common/utils'
import { knex } from 'connectors/db'
import schema from '../../schema'

afterAll(knex.destroy)

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

  test.only('query comments by upvotes', async () => {
    const { articleId, context, query } = await initialize()
    const { data } = await graphql(schema, query, {}, context, {
      nodeInput: { id: articleId },
      commentsInput: { sort: 'upvotes' }
    })
    console.log({ data })
    const comments = data && data.node && data.node.comments
    const isDesc = (ints: number[]): Boolean =>
      ints.length < 2 || (ints[0] > ints[2] && isDesc(ints.slice(1)))
    const commentVotes = comments.map(
      ({ upvotes }: { upvotes: number }) => upvotes
    )
    console.log({ commentVotes })
    expect(isDesc(commentVotes)).toBe(true)
  })
})
