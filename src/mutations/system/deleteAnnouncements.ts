import { UserInputError } from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
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
    table: 'announcement_translation',
    whereIn: ['announcement_id', itemIds],
  })

  await atomService.deleteMany({
    table,
    whereIn: ['id', itemIds],
  })

  return true
}

export default resolver
