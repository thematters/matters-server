import type { GQLUserResolvers } from 'definitions'

import { connectionFromPromisedArray } from 'common/utils'

const resolver: GQLUserResolvers['tags'] = async (
  { id },
  { input },
  { dataSources: { tagService } }
) => connectionFromPromisedArray(tagService.findByMaintainer(id), input)

export default resolver
