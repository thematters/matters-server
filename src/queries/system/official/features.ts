import { isFeatureEnabled } from 'common/utils'
import { OfficialToFeaturesResolver } from 'definitions'

export const features: OfficialToFeaturesResolver = async (
  root,
  input,
  { viewer, dataSources: { systemService } }
) => {
  const featureFlags = await systemService.getFeatureFlags()

  // TODO: add seeding users and filter for circle

  return featureFlags.map(({ name, flag }) => ({
    name,
    enabled: isFeatureEnabled(flag, viewer),
  }))
}
