import { MutationToSetFeatureResolver } from 'definitions'

const resolver: MutationToSetFeatureResolver = async (
  root,
  { input: { name, flag } },
  { dataSources: { systemService } }
) => systemService.setFeatureFlag({ name, flag })

export default resolver
