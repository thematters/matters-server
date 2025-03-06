import type { GQLUserResolvers } from 'definitions/index.js'

import { connectionFromArray, connectionFromQuery } from 'common/utils/index.js'

const resolver: GQLUserResolvers['followers'] = async (
  { id },
  { input },
  { dataSources: { userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }
  const query = userService.findFollowers(id)

  return connectionFromQuery({
    query,
    orderBy: { column: 'order', order: 'desc' },
    cursorColumn: 'id',
    args: input,
  })
}

export default resolver
