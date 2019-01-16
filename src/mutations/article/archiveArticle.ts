import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToArchiveArticleResolver } from 'definitions'
import { ARTICLE_STATE } from 'common/enums'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToArchiveArticleResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { articleService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const { authorId } = await articleService.dataloader.load(dbId)

  if (authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const article = await articleService.baseUpdateById(dbId, {
    state: ARTICLE_STATE.archived
  })

  // trigger notifications
  const downstreams = await articleService.findByUpstream(article.id)
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
