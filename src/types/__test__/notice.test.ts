import _get from 'lodash/get.js'

import { NODE_TYPES } from 'common/enums/index.js'
import { toGlobalId } from 'common/utils/index.js'

import { testClient } from './utils.js'

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
  const server = await testClient({ isAuth: true })
  const { data } = await server.executeOperation({
    query: GET_NOTICES,
    variables: {
      nodeInput: { id: USER_ID },
    },
  })
  const notices = _get(data, 'node.notices.edges')
  expect(notices.length).toBeGreaterThan(0)
})
