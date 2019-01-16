import { AuthenticationError } from 'apollo-server'
import { Context } from 'definitions'

export * from './users'
export * from './articles'

export const rootOSS = (_: any, __: any, { viewer }: Context) => {
  if (!viewer.id) {
    throw new AuthenticationError('anonymous user cannot do this')
  }

  if (viewer.role !== 'admin') {
    throw new AuthenticationError('only admin can do this')
  }

  return true
}
