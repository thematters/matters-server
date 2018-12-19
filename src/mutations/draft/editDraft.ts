import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { uuid, path, field, value } },
  { viewer, draftService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const draft = await draftService.uuidLoader.load(uuid)
  if (!draft) {
    throw new Error('target draft does not exist')
  }
  if (draft.authorId !== viewer.id) {
    throw new Error('disallow to process')
  }

  return draftService.updateByUUID(uuid, { [field]: value })
}

export default resolver
