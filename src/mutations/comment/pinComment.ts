import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id } },
  { viewer, commentService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  // TODO: check permission
  const { id: dbID } = fromGlobalId(id)
  await commentService.baseUpdateById(dbID, {
    pinned: true
  })

  return true
}
export default resolver
