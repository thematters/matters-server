import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id } },
  {
    viewer,
    dataSources: { commentService, articleService, notificationService }
  }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const { articleId } = await commentService.dataloader.load(dbId)
  const { authorId } = await articleService.dataloader.load(articleId)

  if (authorId !== viewer.id) {
    throw new Error('viewer has no permission to do this') // TODO
  }

  await commentService.baseUpdateById(dbId, {
    pinned: true
  })

  // trigger notification
  const article = await articleService.dataloader.load(articleId)
  notificationService.trigger({
    type: 'article_updated',
    article
  })

  return true
}

export default resolver
