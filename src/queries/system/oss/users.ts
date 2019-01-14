import { isNil } from 'lodash'
import { connectionFromPromisedArray } from 'graphql-relay'

import { OSSToUsersResolver } from 'definitions'

export const users: OSSToUsersResolver = async (
  root,
  { input: { ...connectionArgs } },
  { viewer, dataSources: { userService } }
) => {
  return connectionFromPromisedArray(userService.find({}), connectionArgs)
}
