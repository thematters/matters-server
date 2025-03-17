import type { GQLMutationResolvers } from '#definitions/index.js'

const resolver: GQLMutationResolvers['setFeature'] = async (
  _,
  { input: { name, flag, value } },
  { dataSources: { systemService }, viewer }
) => {
  const updated = await systemService.setFeatureFlag({ name, flag, value })
  const enabled = await systemService.isFeatureEnabled(updated.flag, viewer)
  return { name: updated.name, enabled, value: updated.value }
}

export default resolver
