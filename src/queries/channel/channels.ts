import type { GQLQueryResolvers } from 'definitions'

const resolver: GQLQueryResolvers['channels'] = async (
  _,
  __,
  { dataSources: { atomService } }
) => {
  return atomService.findMany({ table: 'channel' })
}

export default resolver
