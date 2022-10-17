import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToDeleteAnnouncementsResolver } from 'definitions'

const resolver: MutationToDeleteAnnouncementsResolver = async (
  root,
  { input: { ids } },
  { dataSources: { atomService } }
) => {
  const table = 'announcement'

  if (!ids || ids.length === 0) {
    throw new UserInputError('required paramter missing: ids')
  }

  const itemIds = ids.map((id) => fromGlobalId(id).id)

  await atomService.deleteMany({
    table,
    whereIn: ['id', itemIds],
  })

  return true
}

export default resolver
