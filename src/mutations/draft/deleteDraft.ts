import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { uuid } },
  { viewer, draftService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const draft = await draftService.baseFindByUUID(uuid)
  if (!draft) {
    throw new Error('target draft does not exist')
  }
  if (draft.authroId !== viewer.id) {
    throw new Error('disallow to process')
  }
  await draftService.baseDelete(draft.id)

  return true
}
export default resolver
