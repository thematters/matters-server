import _ from 'lodash'

import { SCOPE_MODE } from 'common/enums'
import { makeScope } from 'common/utils'

import { adminUser, defaultTestUser, getUserContext, testClient } from './utils'

const testScopes = ['query:viewer:likerId', 'query:viewer:info:email']

const QUERY_CASE_1 = `
  query ($input: UserInput!) {
    viewer {
      displayName
      likerId
      info {
        email
      }
    }
    user(input: $input) {
      displayName
    }
  }
`

const QUERY_CASE_2 = `
  query {
    viewer {
      info {
        mobile
      }
    }
  }
`

const QUERY_CASE_3 = `
  query ($input: UserInput!){
    viewer {
      info {
        email
      }
    }
    user(input: $input) {
      info {
        email
      }
    }
  }
`

const UPDATE_USER_INFO_DESCRIPTION = `
  mutation UpdateUserInfo($input: UpdateUserInfoInput!) {
    updateUserInfo(input: $input) {
      info {
        description
      }
    }
  }
`

const prepare = async ({
  email,
  mode,
  scope
}: {
  email: string
  mode?: string
  scope?: { [key: string]: any }
}) => {
  const context = await getUserContext({ email })
  context.viewer.scopeMode = mode || context.viewer.role
  // @ts-ignore
  context.viewer.scope = scope || {}

  const { mutate, query } = await testClient({ context })
  return { context, mutate, query }
}

// Check OAuth viewer query and mutation are functional or not.
describe('OAuth viewer qeury and mutation', () => {
  const scope = makeScope(testScopes)

  test('query with public and socped fields', async () => {
    const { context, query } = await prepare({
      email: defaultTestUser.email,
      mode: SCOPE_MODE.oauth,
      scope
    })
    const otherUserName = 'test2'
    const { data } = await query({
      query: QUERY_CASE_1,
      variables: { input: { userName: otherUserName } }
    })

    expect(data && data.viewer.displayName).toBe(context.viewer.displayName)
    expect(data && data.viewer.info.email).toBe(context.viewer.email)
    expect(data && data.user.displayName).toBe(otherUserName)
  })

  test('query with no scoped and other private fields', async () => {
    const { context, query } = await prepare({
      email: defaultTestUser.email,
      mode: SCOPE_MODE.oauth,
      scope
    })
    // query no scope field error
    const errorCase1 = await query({ query: QUERY_CASE_2 })
    expect(errorCase1 && errorCase1.errors && errorCase1.errors.length).toBe(1)
    expect(
      errorCase1 && errorCase1.errors && errorCase1.errors[0].message
    ).toBe('viewer has no permission')

    // query other private field error
    const otherUserName = 'test2'
    const errorCase2 = await query({
      query: QUERY_CASE_3,
      variables: { input: { userName: otherUserName } }
    })
    expect(errorCase2 && errorCase2.errors && errorCase2.errors.length).toBe(1)
    expect(
      errorCase2 && errorCase2.errors && errorCase2.errors[0].message
    ).toBe('unauthorized user for field email')
  })

  test('mutation', async () => {
    const { context, mutate } = await prepare({
      email: defaultTestUser.email,
      mode: SCOPE_MODE.oauth,
      scope
    })
    const description = 'foo bar'
    const { errors } = await mutate({
      mutation: UPDATE_USER_INFO_DESCRIPTION,
      variables: { input: { description } }
    })
    expect(errors && errors.length).toBe(1)
    expect(errors && errors[0].message).toBe('oauth is not authorized')
  })
})

// Check general viewer query and mutation are functional or not.
describe('General viewer query and mutation', () => {
  test('query with public and socped fields', async () => {
    const { context, query } = await prepare({ email: defaultTestUser.email })
    const otherUserName = 'test2'
    const { data } = await query({
      query: QUERY_CASE_1,
      variables: { input: { userName: otherUserName } }
    })
    expect(_.get(data, 'viewer.displayName')).toBe(context.viewer.displayName)
    expect(_.get(data, 'viewer.info.email')).toBe(context.viewer.email)
    expect(_.get(data, 'user.displayName')).toBe(otherUserName)
  })

  test('query with private fields', async () => {
    const { context, query } = await prepare({ email: defaultTestUser.email })
    // query no scope field error
    const { data } = await query({ query: QUERY_CASE_2 })
    expect(_.get(data, 'viewer.info.mobile')).toBe(context.viewer.mobile)

    // query other private field error
    const otherUserName = 'test2'
    const error_case = await query({
      query: QUERY_CASE_3,
      variables: { input: { userName: otherUserName } }
    })
    expect(_.get(error_case, 'errors.length')).toBe(1)
    expect(_.get(error_case, 'errors.0.message')).toBe(
      'unauthorized user for field email'
    )
  })

  test('mutation', async () => {
    const description = 'foo bar'
    const { context, mutate } = await prepare({ email: defaultTestUser.email })
    const { data } = await mutate({
      mutation: UPDATE_USER_INFO_DESCRIPTION,
      variables: { input: { description } }
    })
    expect(_.get(data, 'updateUserInfo.info.description')).toEqual(description)
  })
})

// Check admin viewer query and mutation are functional or not.
describe('Admin viewer query and mutation', () => {
  test('query with public and socped fields', async () => {
    const { context, query } = await prepare({ email: adminUser.email })
    const otherUserName = 'test2'
    const { data } = await query({
      query: QUERY_CASE_1,
      variables: { input: { userName: otherUserName } }
    })
    expect(_.get(data, 'viewer.displayName')).toBe(context.viewer.displayName)
    expect(_.get(data, 'viewer.info.email')).toBe(context.viewer.email)
    expect(_.get(data, 'user.displayName')).toBe(otherUserName)
  })

  test('query with private fields', async () => {
    const { context, query } = await prepare({ email: adminUser.email })
    // query no scope field error
    const { data } = await query({ query: QUERY_CASE_2 })
    expect(_.get(data, 'viewer.info.mobile')).toBe(context.viewer.mobile)

    // query other private field error
    const otherUserName = 'test2'
    const { data: data2 } = await query({
      query: QUERY_CASE_3,
      variables: { input: { userName: otherUserName } }
    })
    expect(_.get(data2, 'user.info.email')).toBe('test2@matters.news')
  })

  test('mutation', async () => {
    const description = 'foo bar'
    const { context, mutate } = await prepare({ email: defaultTestUser.email })
    const { data } = await mutate({
      mutation: UPDATE_USER_INFO_DESCRIPTION,
      variables: { input: { description } }
    })
    expect(_.get(data, 'updateUserInfo.info.description')).toEqual(description)
  })
})
