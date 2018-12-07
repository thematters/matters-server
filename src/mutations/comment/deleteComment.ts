import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { uuid } },
  { viewer, commentService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  // TODO: check permission

  await commentService.updateByUUID(uuid, {
    archived: true
  })

  return true
}
export default resolver
