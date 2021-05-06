import _get from 'lodash/get'

import { ARTICLE_ACCESS_TYPE, NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { GQLCommentType } from 'definitions'

import { testClient } from './utils'

const GET_VIEWER_OWN_CIRCLES = `
  query {
    viewer {
      id
      ownCircles {
        id
        name
        members(input: { first: null }) {
          totalCount
        }
      }
      articles(input: { first: null }) {
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
      works(input: { first: null }) {
        totalCount
        edges {
          node {
            id
            access {
              type
              circle {
                id
              }
            }
            revisionCount
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

const QUERY_VIEWER_CIRCLE_INVITATIONS = /* GraphQL*/ `
  query {
    viewer {
      ownCircles {
        id
        invitations(input: { first: null }) {
          totalCount
          edges {
            node {
              id
              invitee {
                ... on User {
                  id
                }
                ... on Person {
                  email
                }
              }
              inviter {
                id
              }
              accepted
            }
          }
        }
      }
    }
  }
`

const CIRCLE_INVITE = /* GraphQL*/ `
  mutation($input: InviteCircleInput!) {
    invite(input: $input) {
      id
      circle {
        id
        name
      }
      invitee {
        ... on User {
          id
        }
        ... on Person {
          email
        }
      }
      inviter {
        id
      }
      freePeriod
      accepted
    }
  }
`

const SUBSCRIBE_CIRCLE = /* GraphQL */ `
  mutation($input: SubscribeCircleInput!) {
    subscribeCircle(input: $input) {
      circle {
        id
        isMember
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

  test('add article to circle with public access, then removes from circle', async () => {
    const path = 'data.putCircleArticles'
    const { query, mutate } = await testClient(userClient)
    const { data } = await query({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')
    const article = _get(data, 'viewer.articles.edges[0].node')

    // add to circle with public access
    const publicInput: Record<string, any> = {
      id: circle.id,
      articles: [article.id],
      type: 'add',
      accessType: ARTICLE_ACCESS_TYPE.public,
    }
    const addedPublicData = await mutate({
      mutation: PUT_CIRCLE_ARTICLES,
      variables: { input: publicInput },
    })
    expect(_get(addedPublicData, `${path}.works.edges[0].node.id`)).toBe(
      article.id
    )
    expect(_get(addedPublicData, `${path}.works.totalCount`)).toBe(1)
    expect(
      _get(addedPublicData, `${path}.works.edges[0].node.access.circle.id`)
    ).toBe(circle.id)
    expect(
      _get(addedPublicData, `${path}.works.edges[0].node.access.type`)
    ).toBe(ARTICLE_ACCESS_TYPE.public)

    // remove public article from circle
    const removedData = await mutate({
      mutation: PUT_CIRCLE_ARTICLES,
      variables: {
        input: {
          ...publicInput,
          type: 'remove',
        },
      },
    })
    expect(_get(removedData, `${path}.works.totalCount`)).toBe(0)
  })

  test('add article to circle with public access, then turns to paywall access', async () => {
    const path = 'data.putCircleArticles'
    const { query, mutate } = await testClient(userClient)
    const { data } = await query({ query: GET_VIEWER_OWN_CIRCLES })
    const circle = _get(data, 'viewer.ownCircles[0]')
    const article = _get(data, 'viewer.articles.edges[0].node')

    // add to circle with public access
    const publicInput: Record<string, any> = {
      id: circle.id,
      articles: [article.id],
      type: 'add',
      accessType: ARTICLE_ACCESS_TYPE.public,
    }
    const addedPublicData = await mutate({
      mutation: PUT_CIRCLE_ARTICLES,
      variables: { input: publicInput },
    })
    expect(_get(addedPublicData, `${path}.works.edges[0].node.id`)).toBe(
      article.id
    )
    expect(_get(addedPublicData, `${path}.works.totalCount`)).toBe(1)
    expect(
      _get(addedPublicData, `${path}.works.edges[0].node.access.circle.id`)
    ).toBe(circle.id)
    expect(
      _get(addedPublicData, `${path}.works.edges[0].node.access.type`)
    ).toBe(ARTICLE_ACCESS_TYPE.public)

    // turns to paywall access
    const paywallInput: Record<string, any> = {
      id: circle.id,
      articles: [article.id],
      type: 'add',
      accessType: ARTICLE_ACCESS_TYPE.paywall,
    }
    const addedPaywallData = await mutate({
      mutation: PUT_CIRCLE_ARTICLES,
      variables: { input: paywallInput },
    })
    expect(_get(addedPaywallData, `${path}.works.edges[0].node.id`)).toBe(
      article.id
    )
    expect(_get(addedPaywallData, `${path}.works.totalCount`)).toBe(1)
    expect(
      _get(addedPaywallData, `${path}.works.edges[0].node.access.circle.id`)
    ).toBe(circle.id)
    expect(
      _get(addedPaywallData, `${path}.works.edges[0].node.access.type`)
    ).toBe(ARTICLE_ACCESS_TYPE.paywall)

    // remove from circle
    const removedData = await mutate({
      mutation: PUT_CIRCLE_ARTICLES,
      variables: {
        input: {
          ...paywallInput,
          type: 'remove',
        },
      },
    })
    expect(_get(removedData, `${path}.works.totalCount`)).toBe(0)
  })

  test('add article to circle with paywall access, then turns to public access', async () => {
    const path = 'data.putCircleArticles'
    const { query, mutate } = await testClient(userClient)
    const { data } = await query({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')
    const article = _get(data, 'viewer.articles.edges[1].node')

    // add to circle with paywall access
    const paywallInput: Record<string, any> = {
      id: circle.id,
      articles: [article.id],
      type: 'add',
      accessType: ARTICLE_ACCESS_TYPE.paywall,
    }
    const addedPaywallData = await mutate({
      mutation: PUT_CIRCLE_ARTICLES,
      variables: { input: paywallInput },
    })
    expect(_get(addedPaywallData, `${path}.works.edges[0].node.id`)).toBe(
      article.id
    )
    expect(_get(addedPaywallData, `${path}.works.totalCount`)).toBe(1)
    expect(
      _get(addedPaywallData, `${path}.works.edges[0].node.access.circle.id`)
    ).toBe(circle.id)
    expect(
      _get(addedPaywallData, `${path}.works.edges[0].node.access.type`)
    ).toBe(ARTICLE_ACCESS_TYPE.paywall)

    // turns to public access
    const publicInput: Record<string, any> = {
      id: circle.id,
      articles: [article.id],
      type: 'add',
      accessType: ARTICLE_ACCESS_TYPE.public,
    }
    const addedPublicData = await mutate({
      mutation: PUT_CIRCLE_ARTICLES,
      variables: { input: publicInput },
    })
    expect(_get(addedPublicData, `${path}.works.totalCount`)).toBe(1)
    expect(
      _get(addedPublicData, `${path}.works.edges[0].node.access.type`)
    ).toBe(ARTICLE_ACCESS_TYPE.public)
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

const ADMIN_USER_ID = 5
const ADMIN_USER_GLOBAL_ID = toGlobalId({
  type: NODE_TYPES.User,
  id: ADMIN_USER_ID,
})

describe('circle invitation management', () => {
  // shared setting
  const errorPath = 'errors.0.extensions.code'
  const userClient = { isAuth: true, isAdmin: false }
  const adminClient = { isAuth: true, isAdmin: true }

  // shared invitee
  const invitees = [
    { id: ADMIN_USER_GLOBAL_ID, email: null },
    { id: null, email: 'someone@matters.news' },
  ]

  test('create invitation', async () => {
    const { query, mutate } = await testClient(userClient)
    const { data } = await query({
      query: QUERY_VIEWER_CIRCLE_INVITATIONS,
    })

    // check current invitations
    const circle = _get(data, 'viewer.ownCircles.0')
    expect(circle.invitations.totalCount).toBe(0)

    // invite users
    const inviteData1 = await mutate({
      mutation: CIRCLE_INVITE,
      variables: {
        input: {
          invitees,
          freePeriod: 3,
          circleId: circle.id,
        },
      },
    })
    expect(_get(inviteData1, 'data.invite').length).toBe(2)
    expect(_get(inviteData1, 'data.invite.0.freePeriod')).toBe(3)
    expect(_get(inviteData1, 'data.invite.0.invitee.id')).toBe(
      ADMIN_USER_GLOBAL_ID
    )
    expect(_get(inviteData1, 'data.invite.1.freePeriod')).toBe(3)
    expect(_get(inviteData1, 'data.invite.1.invitee.email')).toBe(
      'someone@matters.news'
    )

    // re-invite users with different duration
    const inviteData2 = await mutate({
      mutation: CIRCLE_INVITE,
      variables: {
        input: {
          invitees: [...invitees, { id: null, email: 'someone2@matters.news' }],
          freePeriod: 1,
          circleId: circle.id,
        },
      },
    })
    expect(_get(inviteData2, 'data.invite').length).toBe(3)
    expect(_get(inviteData2, 'data.invite.0.freePeriod')).toBe(1)
    expect(_get(inviteData2, 'data.invite.1.freePeriod')).toBe(1)
    expect(_get(inviteData2, 'data.invite.2.freePeriod')).toBe(1)
    expect(_get(inviteData2, 'data.invite.2.invitee.email')).toBe(
      'someone2@matters.news'
    )

    // test validator
    const inviteData3 = await mutate({
      mutation: CIRCLE_INVITE,
      variables: {
        input: {
          invitees,
          freePeriod: 18,
          circleId: circle.id,
        },
      },
    })
    expect(_get(inviteData3, errorPath)).toBe('BAD_USER_INPUT')

    const inviteData4 = await mutate({
      mutation: CIRCLE_INVITE,
      variables: {
        input: {
          invitees: [],
          freePeriod: 1,
          circleId: circle.id,
        },
      },
    })
    expect(_get(inviteData4, errorPath)).toBe('BAD_USER_INPUT')

    const { mutate: adminMutate } = await testClient(adminClient)
    const inviteData5 = await adminMutate({
      mutation: CIRCLE_INVITE,
      variables: {
        input: {
          invitees,
          freePeriod: 1,
          circleId: circle.id,
        },
      },
    })
    expect(_get(inviteData5, errorPath)).toBe('FORBIDDEN')
  })

  test('accept invitation', async () => {
    const { query } = await testClient(userClient)
    const { mutate } = await testClient(adminClient)

    // check init state of invitations
    const { data: ivtData } = await query({
      query: QUERY_VIEWER_CIRCLE_INVITATIONS,
    })
    const circle = _get(ivtData, 'viewer.ownCircles.0')
    const ivtEdges = _get(ivtData, 'viewer.ownCircles.0.invitations.edges', [])
    ivtEdges.forEach((edge: any) => {
      const inviteeId = _get(edge, 'node.invitee.id')

      if (inviteeId === ADMIN_USER_GLOBAL_ID) {
        expect(_get(edge, 'node.accepted')).toBe(false)
      }
    })

    // subscribe invited circle
    const subscribeResult = await mutate({
      mutation: SUBSCRIBE_CIRCLE,
      variables: { input: { id: circle.id, password: '123456' } },
    })
    expect(_get(subscribeResult, 'data.subscribeCircle.circle.id')).toBe(
      circle.id
    )
    expect(_get(subscribeResult, 'data.subscribeCircle.circle.isMember')).toBe(
      true
    )

    // check if it's accept
    const { data: newIvtData } = await query({
      query: QUERY_VIEWER_CIRCLE_INVITATIONS,
    })
    const newIvtEdges = _get(
      newIvtData,
      'viewer.ownCircles.0.invitations.edges',
      []
    )
    newIvtEdges.forEach((edge: any) => {
      const inviteeId = _get(edge, 'node.invitee.id')

      if (inviteeId === ADMIN_USER_GLOBAL_ID) {
        expect(_get(edge, 'node.accepted')).toBe(true)
      }
    })
  })
})
