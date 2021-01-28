import { isFeatureEnabled } from 'common/utils'
import { OfficialToFeaturesResolver } from 'definitions'

export const features: OfficialToFeaturesResolver = async (
  root,
  input,
  { viewer, dataSources: { systemService } }
) => {
  const featureFlags = await systemService.getFeatureFlags()
  const result = await Promise.all(
    featureFlags.map(async ({ name, flag }) => ({
      name,
      enabled: await isFeatureEnabled(flag, viewer),
    }))
  )
  return result
}
