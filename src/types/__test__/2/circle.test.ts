import _get from 'lodash/get'

import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_LICENSE_TYPE,
  NODE_TYPES,
} from 'common/enums'
import { toGlobalId } from 'common/utils'

import { delay, publishArticle, putDraft, testClient } from '../utils'

const GET_VIEWER_OWN_CIRCLES = /* GraphQL */ `
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
  mutation ($input: PutCircleInput!) {
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
  mutation ($input: ToggleItemInput!) {
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
  mutation ($input: PutCircleArticlesInput!) {
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
            license
          }
        }
      }
    }
  }
`

const PUT_CIRCLE_COMMENT = /* GraphQL */ /* GraphQL */ `
  mutation ($input: PutCommentInput!) {
    putComment(input: $input) {
      id
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

const QUERY_CIRCLE_COMMENTS = /* GraphQL */ `
  query ($input: CircleInput!) {
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

const QUERY_VIEWER_CIRCLE_PENDING_INVITES = /* GraphQL */ `
  query {
    viewer {
      ownCircles {
        id
        invites {
          pending(input: { first: null }) {
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
                state
              }
            }
          }
        }
      }
    }
  }
`

const QUERY_VIEWER_CIRCLE_ACCEPTED_INVITES = /* GraphQL */ `
  query {
    viewer {
      ownCircles {
        id
        invites {
          accepted(input: { first: null }) {
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
                state
              }
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
    }
  }
`

const SUBSCRIBE_CIRCLE = /* GraphQL */ `
  mutation ($input: SubscribeCircleInput!) {
    subscribeCircle(input: $input) {
      circle {
        id
        isMember
      }
    }
  }
`

const QUERY_VIEWER_ANALYTICS = /* GraphQL */ `
  query {
    viewer {
      ownCircles {
        id
        analytics {
          content {
            public {
              node {
                id
              }
              readCount
            }
            paywall {
              node {
                id
              }
              readCount
            }
          }
        }
      }
    }
  }
`

const QUERY_CIRCLE_ANALYTICS = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Circle {
        id
        analytics {
          content {
            public {
              node {
                id
              }
              readCount
            }
            paywall {
              node {
                id
              }
              readCount
            }
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
    const server = await testClient(userClient)
    const input: Record<string, any> = {
      name: 'very_long_circle_name',
      displayName: 'very long circle name',
      amount: 20,
    }

    // test long circle name
    const data1 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data1, errorPath)).toBe('NAME_INVALID')

    // test circle name with symbol
    input.name = 'circle-name'
    const data2 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data2, errorPath)).toBe('NAME_INVALID')

    // test long circle display name
    input.name = 'circle1'
    const data3 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data3, errorPath)).toBe('DISPLAYNAME_INVALID')

    // test invalid display name
    input.displayName = '，'
    const data4 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data4, errorPath)).toBe('DISPLAYNAME_INVALID')

    input.displayName = 'Circle 1'
    const data5 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })

    expect(_get(data5, `${path}.name`)).toBe('circle1')
    expect(_get(data5, `${path}.displayName`)).toBe('Circle 1')
    expect(_get(data5, `${path}.prices[0].amount`)).toBe(20)
    expect(_get(data5, `${path}.prices[0].currency`)).toBe('HKD')

    // test create multiple circles
    const data6 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data6, errorPath)).toBe('CIRCLE_CREATION_REACH_LIMIT')

    // test create a duplicate circle
    const serverAdmin = await testClient(adminClient)
    const data7 = await serverAdmin.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data7, errorPath)).toBe('NAME_EXISTS')
  })

  test('update circle', async () => {
    const path = 'data.putCircle'
    const server = await testClient(userClient)
    const { data } = await server.executeOperation({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')
    const input: Record<string, any> = {
      id: circle.id,
      name: 'very_long_circle_name',
    }

    // test cricle name
    const updatedData1 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData1, errorPath)).toBe('NAME_INVALID')

    input.name = 'circle1'
    const updatedData2 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData2, errorPath)).toBe('DUPLICATE_CIRCLE')

    input.name = 'circle2'
    const updatedData3 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData3, `${path}.name`)).toBe('circle2')

    // test circle display name
    delete input.name
    input.displayName = 'very long circle name'
    const updatedData4 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData4, errorPath)).toBe('DISPLAYNAME_INVALID')

    input.displayName = '，'
    const updatedData5 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData5, errorPath)).toBe('DISPLAYNAME_INVALID')

    input.displayName = 'Circle 2'
    const updatedData6 = await server.executeOperation({
      query: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(updatedData6, `${path}.displayName`)).toBe('Circle 2')
  })

  test('toggle follow circle', async () => {
    const path = 'data.toggleFollowCircle'
    const server = await testClient(userClient)
    const { data } = await server.executeOperation({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')

    // test follow circle
    const serverAdmin = await testClient(adminClient)
    const updatedData1 = await serverAdmin.executeOperation({
      query: TOGGLE_FOLLOW_CIRCLE,
      variables: { input: { id: circle.id, enabled: true } },
    })
    expect((_get(updatedData1, `${path}.followers.edges`) as any).length).toBe(
      1
    )

    // test unfollow circle
    const updatedData2 = await serverAdmin.executeOperation({
      query: TOGGLE_FOLLOW_CIRCLE,
      variables: { input: { id: circle.id, enabled: false } },
    })
    expect((_get(updatedData2, `${path}.followers.edges`) as any).length).toBe(
      0
    )
  })

  test('add article to circle with public access, then removes from circle', async () => {
    const path = 'data.putCircleArticles'
    const server = await testClient(userClient)
    const { data } = await server.executeOperation({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')
    const article = _get(data, 'viewer.articles.edges[1].node')

    // add to circle with public access
    const publicInput: Record<string, any> = {
      id: circle.id,
      articles: [article.id],
      type: 'add',
      accessType: ARTICLE_ACCESS_TYPE.public,
      license: ARTICLE_LICENSE_TYPE.cc_0,
    }
    const addedPublicData = await server.executeOperation({
      query: PUT_CIRCLE_ARTICLES,
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
    expect(_get(addedPublicData, `${path}.works.edges[0].node.license`)).toBe(
      ARTICLE_LICENSE_TYPE.cc_0
    )

    // remove public article from circle
    const removedData = await server.executeOperation({
      query: PUT_CIRCLE_ARTICLES,
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
    const server = await testClient(userClient)
    const { data } = await server.executeOperation({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')

    const draft = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
        // iscnPublish: true,
      },
    })
    expect(_get(draft, 'id')).not.toBeNull()

    const publishedDraftId = draft.id // toGlobalId({ type: NODE_TYPES.Draft, id: draftId })
    // const article = _get(data, 'viewer.articles.edges[0].node')
    await publishArticle({ id: publishedDraftId })
    await delay(500)

    // expect(publishState).toBe(PUBLISH_STATE.pending)
    const { data: data1 } = await server.executeOperation({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const article = _get(data1, 'viewer.articles.edges[1].node')
    expect(_get(article, 'id')).not.toBeNull()

    // add to circle with public access
    const publicInput: Record<string, any> = {
      id: circle.id,
      articles: [article.id],
      type: 'add',
      accessType: ARTICLE_ACCESS_TYPE.public,
    }
    const addedPublicData = await server.executeOperation({
      query: PUT_CIRCLE_ARTICLES,
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
    expect(_get(addedPublicData, `${path}.works.edges[0].node.license`)).toBe(
      ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4
    )

    // turns to paywall access
    const paywallInput: Record<string, any> = {
      id: circle.id,
      articles: [article.id],
      type: 'add',
      accessType: ARTICLE_ACCESS_TYPE.paywall,
      license: ARTICLE_LICENSE_TYPE.arr,
    }
    const addedPaywallData = await server.executeOperation({
      query: PUT_CIRCLE_ARTICLES,
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
    expect(_get(addedPaywallData, `${path}.works.edges[0].node.license`)).toBe(
      ARTICLE_LICENSE_TYPE.arr
    )

    // remove from circle
    const removedData = await server.executeOperation({
      query: PUT_CIRCLE_ARTICLES,
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
    const server = await testClient(userClient)
    const { data } = await server.executeOperation({
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
      license: ARTICLE_LICENSE_TYPE.arr,
    }
    const addedPaywallData = await server.executeOperation({
      query: PUT_CIRCLE_ARTICLES,
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
    expect(_get(addedPaywallData, `${path}.works.edges[0].node.license`)).toBe(
      ARTICLE_LICENSE_TYPE.arr
    )

    // turns to public access
    const publicInput: Record<string, any> = {
      id: circle.id,
      articles: [article.id],
      type: 'add',
      accessType: ARTICLE_ACCESS_TYPE.public,
      license: ARTICLE_LICENSE_TYPE.cc_0,
    }
    const addedPublicData = await server.executeOperation({
      query: PUT_CIRCLE_ARTICLES,
      variables: { input: publicInput },
    })
    expect(_get(addedPublicData, `${path}.works.totalCount`)).toBe(1)
    expect(
      _get(addedPublicData, `${path}.works.edges[0].node.access.type`)
    ).toBe(ARTICLE_ACCESS_TYPE.public)
  })

  test('add and retrieve discussion', async () => {
    const server = await testClient(userClient)
    const { data } = await server.executeOperation({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')

    // add
    const { data: addedData } = await server.executeOperation({
      query: PUT_CIRCLE_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'discussion',
            circleId: circle.id,
            type: 'circleDiscussion',
          },
        },
      },
    })
    const commentId = addedData.putComment.id

    expect(commentId).toBeTruthy()

    // retrieve
    const { data: retrieveData } = await server.executeOperation({
      query: QUERY_CIRCLE_COMMENTS,
      variables: {
        input: { name: circle.name },
      },
    })

    expect(retrieveData.circle.discussion.totalCount).toBeGreaterThan(0)
    expect(retrieveData.circle.discussion.edges[0].node?.id).toBe(commentId)
  })

  test('add, pin and retrieve broadcast', async () => {
    const server = await testClient(userClient)
    const { data } = await server.executeOperation({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')

    // add
    const addedData = await server.executeOperation({
      query: PUT_CIRCLE_COMMENT,
      variables: {
        input: {
          comment: {
            content: 'broadcast',
            circleId: circle.id,
            type: 'circleBroadcast',
          },
        },
      },
    })
    const commentId = _get(addedData, `data.putComment.id`)
    expect(commentId).toBeTruthy()

    // pin
    const pinnedData = await server.executeOperation({
      query: TOGGLE_PIN_COMMENT,
      variables: {
        input: {
          id: commentId,
          enabled: true,
        },
      },
    })
    expect(_get(pinnedData, 'data.togglePinComment.pinned')).toBe(true)

    // retrieve
    const retrieveData = await server.executeOperation({
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

  test('circle analytics dashboard', async () => {
    const server = await testClient(userClient)
    const { data } = await server.executeOperation({
      query: QUERY_VIEWER_ANALYTICS,
    })

    const circle = _get(data, 'viewer.ownCircles[0]')
    expect(_get(circle, 'analytics.content.public').length).toBe(0)
    expect(_get(circle, 'analytics.content.paywall').length).toBe(0)

    // check permission
    const serverAdmin = await testClient(adminClient)
    const errorData = await serverAdmin.executeOperation({
      query: QUERY_CIRCLE_ANALYTICS,
      variables: {
        input: { id: circle.id },
      },
    })
    expect(_get(errorData, errorPath)).toBe('FORBIDDEN')
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
    const server = await testClient(userClient)
    const { data: pendingInvites } = await server.executeOperation({
      query: QUERY_VIEWER_CIRCLE_PENDING_INVITES,
    })

    // check current invites
    const circle = _get(pendingInvites, 'viewer.ownCircles.0')
    expect(circle.invites.pending.totalCount).toBe(0)

    // invite users
    const inviteData1 = await server.executeOperation({
      query: CIRCLE_INVITE,
      variables: {
        input: {
          invitees,
          freePeriod: 90,
          circleId: circle.id,
        },
      },
    })
    expect(inviteData1!.data!.invite.length).toBe(2)
    expect(_get(inviteData1, 'data.invite.0.freePeriod')).toBe(90)
    expect(_get(inviteData1, 'data.invite.0.invitee.id')).toBe(
      ADMIN_USER_GLOBAL_ID
    )
    expect(_get(inviteData1, 'data.invite.1.freePeriod')).toBe(90)
    expect(_get(inviteData1, 'data.invite.1.invitee.email')).toBe(
      'someone@matters.news'
    )

    // re-invite users with different duration
    const inviteData2 = await server.executeOperation({
      query: CIRCLE_INVITE,
      variables: {
        input: {
          invitees: [...invitees, { id: null, email: 'someone2@matters.news' }],
          freePeriod: 30,
          circleId: circle.id,
        },
      },
    })
    expect(inviteData2!.data!.invite.length).toBe(3)
    expect(_get(inviteData2, 'data.invite.0.freePeriod')).toBe(30)
    expect(_get(inviteData2, 'data.invite.1.freePeriod')).toBe(30)
    expect(_get(inviteData2, 'data.invite.2.freePeriod')).toBe(30)
    expect(_get(inviteData2, 'data.invite.2.invitee.email')).toBe(
      'someone2@matters.news'
    )

    // test validator
    const inviteData3 = await server.executeOperation({
      query: CIRCLE_INVITE,
      variables: {
        input: {
          invitees,
          freePeriod: 18,
          circleId: circle.id,
        },
      },
    })
    expect(_get(inviteData3, errorPath)).toBe('BAD_USER_INPUT')

    const inviteData4 = await server.executeOperation({
      query: CIRCLE_INVITE,
      variables: {
        input: {
          invitees: [],
          freePeriod: 30,
          circleId: circle.id,
        },
      },
    })
    expect(_get(inviteData4, errorPath)).toBe('BAD_USER_INPUT')

    const serverAdmin = await testClient(adminClient)
    const inviteData5 = await serverAdmin.executeOperation({
      query: CIRCLE_INVITE,
      variables: {
        input: {
          invitees,
          freePeriod: 30,
          circleId: circle.id,
        },
      },
    })
    expect(_get(inviteData5, errorPath)).toBe('FORBIDDEN')
  })

  test('accept invitation', async () => {
    const serverUser = await testClient(userClient)
    const serverAdmin = await testClient(adminClient)

    // check init state of invitations
    const { data: ivtData } = await serverUser.executeOperation({
      query: QUERY_VIEWER_CIRCLE_PENDING_INVITES,
    })
    const circle = _get(ivtData, 'viewer.ownCircles.0')
    const ivtEdges = _get(
      ivtData,
      'viewer.ownCircles.0.invites.pending.edges',
      []
    )
    ivtEdges.forEach((edge: any) => {
      const inviteeId = _get(edge, 'node.invitee.id')

      if (inviteeId === ADMIN_USER_GLOBAL_ID) {
        expect(_get(edge, 'node.state')).toBe('pending')
      }
    })

    // subscribe invited circle
    const subscribeResult = await serverAdmin.executeOperation({
      query: SUBSCRIBE_CIRCLE,
      variables: { input: { id: circle.id, password: '123456' } },
    })
    expect(_get(subscribeResult, 'data.subscribeCircle.circle.id')).toBe(
      circle.id
    )
    expect(_get(subscribeResult, 'data.subscribeCircle.circle.isMember')).toBe(
      true
    )

    // check if it's accepted
    const { data: newIvtData } = await serverUser.executeOperation({
      query: QUERY_VIEWER_CIRCLE_ACCEPTED_INVITES,
    })
    const newIvtEdges = _get(
      newIvtData,
      'viewer.ownCircles.0.invites.accepted.edges',
      []
    )
    newIvtEdges.forEach((edge: any) => {
      const inviteeId = _get(edge, 'node.invitee.id')

      if (inviteeId === ADMIN_USER_GLOBAL_ID) {
        expect(_get(edge, 'node.state')).toBe('accepted')
      }
    })
  })
})
