import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id, tag } },
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

  const tags = draft.tags.filter((item: string) => item != tag)
  return await draftService.baseUpdateById(dbId, { tags })
}

export default resolver
