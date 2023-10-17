import type { GQLMutationResolvers } from 'definitions'

const resolver: GQLMutationResolvers['setEmail'] = async (
  _,
  { input: { email: rawEmail } },
  { dataSources: { userService }, viewer }
) => {
  const email = rawEmail.toLowerCase()

  // check new email
  return userService.setEmail(viewer.id, email)
}

export default resolver
