import type { GQLMutationResolvers } from 'definitions'

import { UserInputError } from 'common/errors'

const resolver: GQLMutationResolvers['deleteBlockedSearchKeywords'] = async (
  root,
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
