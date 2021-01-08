import _get from 'lodash/get'

import { fromGlobalId } from 'common/utils'

import { testClient } from './utils'

const GET_VIEWER_OWN_CIRCLES = `
  query {
    viewer {
      ownCircles {
        id
      }
    }
  }
`

const PUT_CIRCLE = `
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

const TOGGLE_FOLLOW_CIRCLE = `
  mutation($input: ToggleItemInput!) {
    toggleFollowCircle(input: $input) {
      id
      followers(input: { first: null }) {
        totalCount
        edges {
          node {
            ...on User {
              id
            }
          }
        }
      }
    }
  }
`

const SUBSCRIBE_CIRCLE = `
  mutation($input: ToggleItemInput!) {
    subscribeCircle(input: $input) {
      client_secret
    }
  }
`

const UNSUBSCRIBE_CIRCLE = `
  mutation($input: ToggleItemInput!) {
    unsubscribeCircle(input: $input) {
      id
      members(input: { first: null }) {
        totoalCount
        edges {
          node {
            user {
              id
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

  test('create circle', async () => {
    const path = 'data.putCircle'
    const { mutate } = await testClient({ isAuth: true, isAdmin: false })
    const input: Record<string, any> = {
      name: 'very_long_circle_name',
      displayName: 'very long circle name',
      amount: 10,
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
    expect(_get(data5, `${path}.prices[0].amount`)).toBe(10)
    expect(_get(data5, `${path}.prices[0].currency`)).toBe('HKD')

    // test create multiple circles
    const data6 = await mutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data6, errorPath)).toBe('FORBIDDEN')

    // test create a duplicate circle
    const { mutate: adminMutate } = await testClient({
      isAuth: true,
      isAdmin: true,
    })
    const data7 = await adminMutate({
      mutation: PUT_CIRCLE,
      variables: { input },
    })
    expect(_get(data7, errorPath)).toBe('NAME_EXISTS')
  })

  test('update circle', async () => {
    const path = 'data.putCircle'
    const { query, mutate } = await testClient({ isAuth: true, isAdmin: false })
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
    const { query, mutate } = await testClient({ isAuth: true, isAdmin: false })
    const { data } = await query({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')

    // test follow circle
    const { mutate: adminMutate } = await testClient({
      isAuth: true,
      isAdmin: true,
    })
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

  test('subscribe circle', async () => {
    const { query } = await testClient({ isAuth: true, isAdmin: false })
    const { data } = await query({
      query: GET_VIEWER_OWN_CIRCLES,
    })
    const circle = _get(data, 'viewer.ownCircles[0]')

    // subscribe
    const { query: adminQuery, mutate: adminMutate } = await testClient({
      isAuth: true,
      isAdmin: true,
    })
    const updatedData = await adminMutate({
      mutation: SUBSCRIBE_CIRCLE,
      variables: { id: circle.id },
    })
  })

  test('unsuscribe cricle', async () => {
    // TODO
  })
})
