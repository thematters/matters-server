// external
import { graphql } from 'graphql'
// local
import { makeContext, toGlobalId } from 'common/utils'
import { knex } from 'connectors/db'
import schema from '../../schema'

afterAll(knex.destroy)

test('query tag on article', async () => {
  const id = toGlobalId({ type: 'Article', id: 1 })
  const query = `
      query($input: NodeInput!) {
        node(input: $input) {
          ... on Article {
            id
            tags {
              content
            }
          }
        }
      }
    `
  const context = await makeContext({ req: {} })
  const { data } = await graphql(schema, query, {}, context, {
    input: { id }
  })
  const tags = data && data.node && data.node.tags
  expect(
    new Set(tags.map(({ content }: { content: string }) => content))
  ).toEqual(new Set(['article', 'test']))
})
