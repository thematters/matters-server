import _get from 'lodash/get'

import { GQLCommentType } from 'definitions'

import { testClient } from './utils'

const GET_VIEWER_OWN_CIRCLES = `
  query {
    viewer {
      ownCircles {
        id
        name
        members(input: { first: null }) {
          totalCount
        }
      }
      articles(input: { first: 1 }) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`

const PUT_CIRCLE = /* GraphQL */ `
  mutation($input: PutCircleInput!) {
    putCircle(input: $input) {
      id
      name
      displayName
      prices {
        id
        amount
        currency
      }
      owner {
        id
      }
    }
  }
`

const TOGGLE_FOLLOW_CIRCLE = /* GraphQL */ `
  mutation($input: ToggleItemInput!) {
    toggleFollowCircle(input: $input) {
      id
      followers(input: { first: null }) {
        totalCount
        edges {
          node {
            ... on User {
              id
            }
          }
        }
      }
    }
  }
`

const PUT_CIRCLE_ARTICLES = /* GraphQL */ `
  mutation($input: PutCircleArticlesInput!) {
    putCircleArticles(input: $input) {
      id
      works(input: { first: 0 }) {
        totalCount
        edges {
          node {
            id
            limitedFree
          }
        }
      }
    }
  }
`

const PUT_CIRCLE_COMMENT = /* GraphQL */ /* GraphQL */ `
  mutation($input: PutCommentInput!) {
    putComment(input: $input) {
      id
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

const QUERY_CIRCLE_COMMENTS = /* GraphQL */ `
  query($input: CircleInput!) {
    circle(input: $input) {
      id
      discussion(input: { first: null }) {
        totalCount
        edges {
          node {
            id
          }
        }
      }
      pinnedBroadcast {
        id
      }
      broadcast(input: { first: null }) {
        totalCount
        edges {
          node {
            id
          }
        }
      }
    }
  }
`

describe('circle CRUD', () => {
  // shared setting
  const errorPath = 'errors.0.extensions.code'

  const userClient = { isAuth: true, isAdmin: false }
  const adminClient = { isAuth: true, isAdmin: true }

  test('create circle', async () => {
    const path = 'data.putCircle'
    const { mutate } = await testClient(userClient)
    const input: Record<string, any> = {
      name: 'very_long_circle_name',
      displayName: 'very long circle name',
      amount: 20,
    }

    // test long circle name
    const data1 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data1, errorPath)).toBe('NAME_INVALID')

    // test circle name with symbol
    input.name = 'circle-name'
    const data2 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data2, errorPath)).toBe('NAME_INVALID')

    // test long circle display name
    input.name = 'circle1'
    const data3 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data3, errorPath)).toBe('DISPLAYNAME_INVALID')

    // test invalid display name
    input.displayName = '，'
    const data4 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data4, errorPath)).toBe('DISPLAYNAME_INVALID')

    input.displayName = 'Circle 1'
    const data5 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })

    expect(_get(data5, `${path}.name`)).toBe('circle1')
    expect(_get(data5, `${path}.displayName`)).toBe('Circle 1')
    expect(_get(data5, `${path}.prices[0].amount`)).toBe(20)
    expect(_get(data5, `${path}.prices[0].currency`)).toBe('HKD')

    // test create multiple circles
    const data6 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data6, errorPath)).toBe('CIRCLE_CREATION_REACH_LIMIT')

    // test create a duplicate circle
    const { mutate: adminMutate } = await testClient(adminClient)
    const data7 = await adminMutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data7, errorPath)).toBe('NAME_EXISTS')
  })

  test('update circle', async () => {
    const path = 'data.putCircle'
    const { query, mutate } = await testClient(userClient)
    const { data } = await query({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')
    const input: Record<string, any> = {
      id: circle.id,
      name: 'very_long_circle_name',
    }

    // test cricle name
    const updatedData1 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData1, errorPath)).toBe('NAME_INVALID')

    input.name = 'circle1'
    const updatedData2 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData2, errorPath)).toBe('DUPLICATE_CIRCLE')

    input.name = 'circle2'
    const updatedData3 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData3, `${path}.name`)).toBe('circle2')

    // test circle display name
    delete input.name
    input.displayName = 'very long circle name'
    const updatedData4 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData4, errorPath)).toBe('DISPLAYNAME_INVALID')

    input.displayName = '，'
    const updatedData5 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData5, errorPath)).toBe('DISPLAYNAME_INVALID')

    input.displayName = 'Circle 2'
    const updatedData6 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData6, `${path}.displayName`)).toBe('Circle 2')
  })

  test('toggle follow circle', async () => {
    const path = 'data.toggleFollowCircle'
    const { query } = await testClient(userClient)
    const { data } = await query({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')

    // test follow circle
    const { mutate: adminMutate } = await testClient(adminClient)
    const updatedData1 = await adminMutate({
      mutation: TOGGLE_FOLLOW_CIRCLE,
      variables: { input: { id: circle.id, enabled: true } },
    })
    expect(_get(updatedData1, `${path}.followers.edges`).length).toBe(1)

    // test unfollow circle
    const updatedData2 = await adminMutate({
      mutation: TOGGLE_FOLLOW_CIRCLE,
      variables: { input: { id: circle.id, enabled: false } },
    })
    expect(_get(updatedData2, `${path}.followers.edges`).length).toBe(0)
  })

  test('toggle circle articles', async () => {
    const path = 'data.putCircleArticles'
    const { query, mutate } = await testClient(userClient)
    const { data } = await query({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')
    const article = _get(data, 'viewer.articles.edges[0].node')

    // add
    const input: Record<string, any> = {
      id: circle.id,
      articles: [article.id],
      type: 'add',
    }

    const addedData = await mutate({
      mutation: PUT_CIRCLE_ARTICLES,
      variables: { input },
    })
    expect(_get(addedData, `${path}.works.edges[0].node.id`)).toBe(article.id)
    expect(_get(addedData, `${path}.works.totalCount`)).toBe(1)
    expect(_get(addedData, `${path}.works.edges[0].node.limitedFree`)).toBe(
      true
    )

    // remove
    input.type = 'remove'
    const removedData = await mutate({
      mutation: PUT_CIRCLE_ARTICLES,
      variables: { input },
    })
    expect(_get(removedData, errorPath)).toBe('FORBIDDEN')
  })

  test('add and retrieve discussion', async () => {
    const { query, mutate } = await testClient(userClient)
    const { data } = await query({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')

    // add
    const addedData = await mutate({
      mutation: PUT_CIRCLE_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'discussion',
            circleId: circle.id,
            type: GQLCommentType.circleDiscussion,
          },
        },
      },
    })
    const commentId = _get(addedData, `data.putComment.id`)

    expect(commentId).toBeTruthy()

    // retrieve
    const retrieveData = await query({
      query: QUERY_CIRCLE_COMMENTS,
      variables: {
        input: { name: circle.name },
      },
    })

    expect(
      _get(retrieveData, 'data.circle.discussion.totalCount')
    ).toBeGreaterThan(0)
    expect(_get(retrieveData, 'data.circle.discussion.edges.0.node.id')).toBe(
      commentId
    )
  })

  test('add, pin and retrieve broadcast', async () => {
    const { query, mutate } = await testClient(userClient)
    const { data } = await query({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')

    // add
    const addedData = await mutate({
      mutation: PUT_CIRCLE_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'broadcast',
            circleId: circle.id,
            type: GQLCommentType.circleBroadcast,
          },
        },
      },
    })
    const commentId = _get(addedData, `data.putComment.id`)
    expect(commentId).toBeTruthy()

    // pin
    const pinnedData = await mutate({
      mutation: TOGGLE_PIN_COMMENT,
      variables: {
        input: {
          id: commentId,
          enabled: true,
        },
      },
    })
    expect(_get(pinnedData, 'data.togglePinComment.pinned')).toBe(true)

    // retrieve
    const retrieveData = await query({
      query: QUERY_CIRCLE_COMMENTS,
      variables: {
        input: { name: circle.name },
      },
    })

    expect(
      _get(retrieveData, 'data.circle.broadcast.totalCount')
    ).toBeGreaterThan(0)
    expect(_get(retrieveData, 'data.circle.broadcast.edges.0.node.id')).toBe(
      commentId
    )
    expect(_get(retrieveData, 'data.circle.pinnedBroadcast.0.id')).toBe(
      commentId
    )
  })
})
