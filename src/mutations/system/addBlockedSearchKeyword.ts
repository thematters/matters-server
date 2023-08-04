import type { GQLMutationResolvers } from 'definitions'

import { UserInputError } from 'common/errors'

const resolver: GQLMutationResolvers['addBlockedSearchKeyword'] = async (
  root,
  { input: { keyword } },
  { dataSources: { atomService, systemService }, viewer }
) => {
  const table = 'blocked_search_keyword'

  const search_key = await atomService.findFirst({
    table,
    where: { search_key: keyword },
  })

  if (search_key) {
    throw new UserInputError('blocked search keyword already exists.')
  }

  const newItem = await atomService.create({
    table,
    data: { search_key: keyword },
  })

  const newAddedKeyword = {
    ...newItem,
  }
  return newAddedKeyword
}

export default resolver
