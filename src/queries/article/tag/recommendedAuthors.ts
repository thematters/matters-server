import type { GQLTagResolvers } from 'definitions'

import { connectionFromArray } from 'common/utils'

const resolver: GQLTagResolvers['recommendedAuthors'] = async (
  { id },
  { input },
  { dataSources: { tagService, atomService } }
) => {
  // const { take, skip } = fromConnectionArgs(input)

  if (!id) {
    return connectionFromArray([], input)
  }

  return connectionFromArray([], input)

  // return connectionFromPromisedArray(tags.slice(s, end), input, totalCount)
}

export default resolver
