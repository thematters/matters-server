import type { GQLOfficialResolvers } from 'definitions'

export const features: GQLOfficialResolvers['features'] = async (
  _,
  __,
  { viewer, dataSources: { systemService } }
) => {
  const featureFlags = await systemService.getFeatureFlags()
  return await Promise.all(
    featureFlags.map(async ({ name, flag, value }) => ({
      name,
      enabled: await systemService.isFeatureEnabled(flag, viewer),
      value,
    }))
  )
}
