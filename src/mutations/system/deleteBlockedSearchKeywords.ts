import { UserInputError } from 'common/errors'
import { MutationToDeleteBlockedSearchKeywordsResolver } from 'definitions'

const resolver: MutationToDeleteBlockedSearchKeywordsResolver = async (
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
