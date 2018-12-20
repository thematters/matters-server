import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id, field, value } },
  { viewer, draftService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const { id: dbId } = fromGlobalId(id)
  const draft = await draftService.idLoader.load(dbId)
  if (!draft) {
    throw new Error('target draft does not exist')
  }
  if (draft.authorId !== viewer.id) {
    throw new Error('disallow to process')
  }

  return draftService.baseUpdateById(dbId, { [field]: value })
}

export default resolver
