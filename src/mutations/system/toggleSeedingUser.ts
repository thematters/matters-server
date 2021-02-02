import { MutationToToggleSeedingUserResolver } from 'definitions'

const resolver: MutationToToggleSeedingUserResolver = async (
  root,
  { input: { id, enabled } },
  { dataSources: { atomService, systemService }, viewer }
) => {
  // TODO
  return true
}

export default resolver
