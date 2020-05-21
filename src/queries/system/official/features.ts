import { USER_ROLE } from 'common/enums'
import { GQLFeatureFlag, OfficialToFeaturesResolver } from 'definitions'

export const features: OfficialToFeaturesResolver = async (
  root,
  input,
  { dataSources: { systemService }, viewer }
) => {
  const featureFlags = await systemService.getFeatureFlags()

  const enabled = (flag: GQLFeatureFlag) =>
    flag === 'on'
      ? true
      : flag === 'off'
      ? false
      : viewer.role === USER_ROLE.admin
      ? true
      : false

  return featureFlags.map(({ name, flag }) => ({
    name,
    enabled: enabled(flag),
  }))
}
