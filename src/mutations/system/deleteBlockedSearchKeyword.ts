import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
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

  const itemIds = keywords.map((keyword) => fromGlobalId(keyword).id)

  await atomService.deleteMany({
    table,
    whereIn: ['id', itemIds],
  })

  return true
}

export default resolver
