import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { uuid, tag } },
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

  const tags = draft.tags.filter((item: string) => item != tag)
  const result = await draftService.baseUpdateByUUID(uuid, { tags })
  return true
}

export default resolver
