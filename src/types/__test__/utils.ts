// external
import { graphql } from 'graphql'
// local
import schema from '../../schema'
import { makeContext } from 'common/utils'

export const testUser = {
  email: 'test1@matters.news',
  password: '123'
}

export const loginQuery = `
  mutation UserLogin($input: UserLoginInput!) {
    userLogin(input: $input) {
      auth
      token
    }
  }
`

export const login = async ({
  email,
  password
}: {
  email: string
  password: string
}) => {
  const context = await makeContext({ req: {} })
  const { data } = await graphql(schema, loginQuery, {}, context, {
    input: { email, password }
  })

  const result = data && data.userLogin
  return result
}

export const authContext = async (user = testUser) => {
  const { token } = await login(user)
  return await makeContext({
    req: { headers: { 'x-access-token': token } }
  })
}
