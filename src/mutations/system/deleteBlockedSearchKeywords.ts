import type { GQLMutationResolvers } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'

const resolver: GQLMutationResolvers['deleteBlockedSearchKeywords'] = async (
  _,
  { input: { keywords } },
  { dataSources: { atomService } }
) => {
  const table = 'search_history'

  if (!keywords) {
    throw new UserInputError('required paramter missing: keywords')
  }
  await atomService.deleteMany({
    table,
    whereIn: ['search_key', keywords],
  })

  return true
}

export default resolver
