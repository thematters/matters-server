import type { GQLTagResolvers } from 'definitions'

const resolver: GQLTagResolvers['creator'] = (
  { creator },
  _,
  { dataSources: { atomService } }
) => {
  if (!creator) {
    return null
  }

  return atomService.userIdLoader.load(creator)
}

export default resolver
