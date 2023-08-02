import type { GQLTagResolvers } from 'definitions'

const resolver: GQLTagResolvers['creator'] = (
  { creator },
  _,
  { dataSources: { userService } }
) => {
  if (!creator) {
    return null
  }

  return userService.loadById(creator)
}

export default resolver
