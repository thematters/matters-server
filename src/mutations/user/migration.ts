import { OAUTH_TYPES } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'
// import { migrationQueue } from 'connectors/queue/migration'
import { MutationToMigrationResolver } from 'definitions'

const resolver: MutationToMigrationResolver = async (
  _,
  { input: { oauthType } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission.')
  }

  const oauthTypes = await userService.findOAuthTypes({ userId: viewer.id })
  const hasOAuthType = (oauthTypes || []).includes(oauthType)

  if (!hasOAuthType) {
    throw new ForbiddenError('viewer has no specific oauth.')
  }

  // migrationQueue.migrate({ userId: viewer.id, oauthType })
  return true
}

export default resolver
