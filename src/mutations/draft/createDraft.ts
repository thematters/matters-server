import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { upstreamId, title, content, tags, cover } },
  { viewer, draftService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const { id: upstreamDBId } = fromGlobalId(upstreamId)

  return await draftService.create({
    authorId: viewer.id,
    upstreamId: upstreamDBId,
    title,
    cover,
    content,
    tags
  })
}

export default resolver
