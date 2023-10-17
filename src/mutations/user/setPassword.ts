import type { GQLMutationResolvers } from 'definitions'

const resolver: GQLMutationResolvers['setPassword'] = async (
  _,
  { input: { password } },
  { viewer, dataSources: { userService } }
) => {
  return userService.setPassword(viewer, password)
}

export default resolver
