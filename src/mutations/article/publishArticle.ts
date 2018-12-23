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
    summary,
    content,
    tags
  } = await draftService.dataloader.load(draftDBId)

  if (authorId !== viewer.id) {
    throw new Error('draft does not exists') // TODO
  }

  const article = await articleService.create({
    authorId,
    upstreamId,
    title,
    cover,
    summary,
    content,
    tags
  })

  // TODO: add ipfs logic
  // TODO: add count down for publish to IPFS
  // mark draft as read and add to search engine after countdown

  return article
}

export default resolver
