import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id } },
  { viewer, commentService, articleService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const { articleId } = await commentService.idLoader.load(dbId)
  const { authorId } = await articleService.idLoader.load(articleId)

  if (authorId !== viewer.id) {
    throw new Error('viewer has no permission to do this') // TODO
  }

  await commentService.baseUpdateById(dbId, {
    pinned: true
  })

  return true
}

export default resolver
