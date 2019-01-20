import { AuthenticationError } from 'apollo-server'

import { MutationToUpdateUserStateResolver } from 'definitions'
import { isProd } from 'common/environment'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToUpdateUserStateResolver = async (
  _,
  { input: { id, state } },
  { viewer, dataSources: { userService } }
) => {
  if (isProd) {
    throw new AuthenticationError('cannot do this in production')
  }

  const { id: dbId } = fromGlobalId(id)

  return await userService.updateState({
    userId: dbId,
    state
  })
}

export default resolver
