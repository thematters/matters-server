import { isFeatureEnabled } from 'common/utils'
import { MutationToSetFeatureResolver } from 'definitions'

const resolver: MutationToSetFeatureResolver = async (
  root,
  { input: { name, flag } },
  { dataSources: { systemService }, viewer }
) => {
  const updated = await systemService.setFeatureFlag({ name, flag })
  return {
    name: updated.name,
    enabled: isFeatureEnabled(updated.flag, viewer),
  }
}

export default resolver
