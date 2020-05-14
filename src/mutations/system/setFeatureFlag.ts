import { MutationToSetFeatureFlagResolver } from 'definitions'

const resolver: MutationToSetFeatureFlagResolver = async (
  root,
  { input: { name, flag } },
  { dataSources: { systemService } }
) => systemService.setFeatureFlags({ name, flag })

export default resolver
