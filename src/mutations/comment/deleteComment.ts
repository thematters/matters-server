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

  const { id: dbId } = fromGlobalId(id)
  const { authorId } = await commentService.idLoader.load(dbId)

  if (authorId !== viewer.id) {
    throw new Error('viewer has no permission to do this') // TODO
  }

  await commentService.baseUpdateById(dbId, {
    archived: true
  })

  return true
}
export default resolver
