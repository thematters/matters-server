import _get from 'lodash/get'

import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import { testClient } from './utils'

const USER_ID = toGlobalId({ type: NODE_TYPES.User, id: 1 })
const GET_NOTICES = /* GraphQL */ `
  query ($nodeInput: NodeInput!) {
    node(input: $nodeInput) {
      ... on User {
        notices(input: { first: 100 }) {
          edges {
            node {
              id
              __typename
              createdAt
              unread
            }
          }
        }
      }
    }
  }
`

test('query notices', async () => {
  const { query } = await testClient({ isAuth: true })
  const { data } = await query({
    query: GET_NOTICES,
    // @ts-ignore
    variables: {
      nodeInput: { id: USER_ID },
    },
  })
  const notices = _get(data, 'node.notices.edges')
  expect(notices.length).toBeGreaterThan(0)
})
