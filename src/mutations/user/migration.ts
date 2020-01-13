import { OAUTH_PROVIDER } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'
// import { migrationQueue } from 'connectors/queue/migration'
import { MutationToMigrationResolver } from 'definitions'

const resolver: MutationToMigrationResolver = async (
  _,
  { input: { provider } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission.')
  }

  const oauthProviders = await userService.findOAuthProviders({
    userId: viewer.id
  })
  const hasOAuthProvider = (oauthProviders || []).includes(provider)

  if (!hasOAuthProvider) {
    throw new ForbiddenError(`viewer has no specific oauth ${provider}.`)
  }

  // migrationQueue.migrate({ userId: viewer.id, provider })
  return true
}

export default resolver
