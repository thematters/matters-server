import { OfficialToFeaturesResolver } from 'definitions'

export const features: OfficialToFeaturesResolver = (
  root,
  input,
  { dataSources: { systemService } }
) => systemService.getFeatureFlags()
