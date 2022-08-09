import { UserInputError } from 'common/errors'
import { MutationToAddBlockedSearchKeywordResolver } from 'definitions'

const resolver: MutationToAddBlockedSearchKeywordResolver = async (
  root,
  { input: { keyword } },
  { dataSources: { atomService, systemService }, viewer }
) => {
  const table = 'blocked_search_keyword'

  // create
  if (!keyword) {
    throw new UserInputError('required parameters missing: keyword')
  }

  const newItem = await atomService.create({
    table,
    data: { search_key : keyword },
  })

  const newAddedKeyword = {
    ...newItem,
  }
  return newAddedKeyword
}

export default resolver
