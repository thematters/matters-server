import { MutationToToggleFeatureResolver } from 'definitions'

const resolver: MutationToToggleFeatureResolver = async (
  root,
  { input: { name } },
  { dataSources: { systemService } }
) => systemService.toggleFeature({ name })

export default resolver
