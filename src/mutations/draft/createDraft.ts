import { v4 } from 'uuid'
import { ItemData, Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { upstreamUUID, title, content, tags, cover } },
  { viewer, draftService, articleService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const article = await articleService.uuidLoader.load(upstreamUUID)
  if (!article) {
    throw new Error('upstream article does not exist')
  }
  const data: ItemData = {
    uuid: v4(),
    authorId: viewer.id,
    upstreamId: article.id,
    title,
    cover,
    abstract: '',
    content,
    tags
  }
  return await draftService.baseCreate(data)
}

export default resolver
