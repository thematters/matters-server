import type { GQLMutationResolvers } from 'definitions'

const resolver: GQLMutationResolvers['setPassword'] = async (
  _,
  { input: { password } },
  { viewer, dataSources: { userService } }
) => {
  return userService.setPassword(viewer.id, password)
}

export default resolver
