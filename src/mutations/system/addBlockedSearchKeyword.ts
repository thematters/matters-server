import type { GQLMutationResolvers } from 'definitions/index.js'

import { UserInputError } from 'common/errors.js'

const resolver: GQLMutationResolvers['addBlockedSearchKeyword'] = async (
  _,
  { input: { keyword } },
  { dataSources: { atomService } }
) => {
  const table = 'blocked_search_keyword'

  const search_key = await atomService.findFirst({
    table,
    where: { searchKey: keyword },
  })

  if (search_key) {
    throw new UserInputError('blocked search keyword already exists.')
  }

  const newItem = await atomService.create({
    table,
    data: { searchKey: keyword },
  })

  const newAddedKeyword = {
    ...newItem,
  }
  return newAddedKeyword
}

export default resolver
