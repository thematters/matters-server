import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root,
  { input: { id } },
  { viewer, articleService, draftService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: draftDBId } = fromGlobalId(id)
  const {
    authorId,
    upstreamId,
    title,
    cover,
    abstract,
    content,
    tags
  } = await draftService.dataloader.load(draftDBId)

  if (authorId !== viewer.id) {
    throw new Error('draft does not exists') // TODO
  }

  // TODO: add ipfs logic
  const article = await articleService.create({
    authorId,
    upstreamId,
    title,
    cover,
    abstract,
    content,
    tags
  })

  // TODO: Mark draft as used

  return article
}

export default resolver
