import { Resolver } from 'definitions'
import { ARTICLE_STATE } from 'common/enums'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { articleService, notificationService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const { authorId } = await articleService.dataloader.load(dbId)

  if (authorId !== viewer.id) {
    throw new Error('viewer has no permission to do this') // TODO
  }

  const article = await articleService.baseUpdateById(dbId, {
    state: ARTICLE_STATE.archived
  })

  // trigger notifications
  const downstreams = await articleService.findByUpstream(article.id, 0) // TODO: Limit
  downstreams.map((downstream: any) => {
    notificationService.trigger({
      event: 'upstream_article_archived',
      recipientId: downstream.authorId,
      entities: [
        {
          type: 'target',
          entityTable: 'article',
          entity: downstream
        },
        {
          type: 'upstream',
          entityTable: 'article',
          entity: article
        }
      ]
    })
  })
  if (article.upstreamId) {
    const upstream = await articleService.dataloader.load(article.upstreamId)
    notificationService.trigger({
      event: 'downstream_article_archived',
      recipientId: upstream.authorId,
      entities: [
        {
          type: 'target',
          entityTable: 'article',
          entity: upstream
        },
        {
          type: 'downstream',
          entityTable: 'article',
          entity: article
        }
      ]
    })
  }

  return article
}

export default resolver
