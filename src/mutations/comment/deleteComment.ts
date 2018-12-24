import { Resolver } from 'definitions'
import { fromGlobalId, toGlobalId } from 'common/utils'
import pubsub from 'common/pubsub'

const resolver: Resolver = async (
  _,
  { input: { id } },
  { viewer, commentService, articleService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const { authorId, articleId } = await commentService.idLoader.load(dbId)

  if (authorId !== viewer.id) {
    throw new Error('viewer has no permission to do this') // TODO
  }

  await commentService.baseUpdateById(dbId, {
    archived: true
  })

  try {
    const article = await articleService.idLoader.load(articleId)
    pubsub.publish(toGlobalId({ type: 'Article', id: articleId }), article)
  } catch (e) {
    //
  }

  return true
}
export default resolver
