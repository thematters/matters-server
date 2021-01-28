import { isFeatureEnabled } from 'common/utils'
import { MutationToSetFeatureResolver } from 'definitions'

const resolver: MutationToSetFeatureResolver = async (
  root,
  { input: { name, flag } },
  { dataSources: { systemService }, viewer }
) => {
  const updated = await systemService.setFeatureFlag({ name, flag })
  const enabled = await isFeatureEnabled(updated.flag, viewer)
  return { name: updated.name, enabled }
}

export default resolver
