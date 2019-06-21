import { difference } from 'lodash'
import { MutationToSetCollectionResolver } from 'definitions'
import { EntityNotFoundError, ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToSetCollectionResolver = async (
  root,
  { input: { id, collection } },
  { viewer, dataSources: { articleService, notificationService } }
) => {
  const entranceId = fromGlobalId(id).id
  const article = await articleService.baseFindById(entranceId)
  if (!article) {
    throw new EntityNotFoundError('target does not exist')
  }

  if (article.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  // Compare new and old collections
  const oldIds = (await articleService.findCollections({
    entranceId,
    limit: null
  })).map(({ articleId }: any) => articleId)
  const newIds = collection.map(id => fromGlobalId(id).id)
  const addItems: any[] = []
  const updateItems: any[] = []
  const deleteItems: any[] = []
  const diff = difference(newIds, oldIds)

  // Gather data
  newIds.map((id: string, index: number) => {
    const indexOf = oldIds.indexOf(id)
    if (indexOf < 0) {
      addItems.push({ entranceId, articleId: id, order: index })
    }
    if (indexOf >= 0 && index !== indexOf) {
      updateItems.push({ entranceId, articleId: id, order: index })
    }
  })

  // Add and update
  await Promise.all([
    ...addItems.map((data: any) => articleService.insertCollection(data)),
    ...updateItems.map((data: any) =>
      articleService.updateCollectionOrder(data)
    )
  ])

  // Delete unwanted
  await articleService.deleteCollectionByArticleIds({
    entranceId,
    articleIds: difference(oldIds, newIds)
  })

  // trigger notifications
  diff.forEach(async (id: string) => {
    const collection = await articleService.baseFindById(id)
    notificationService.trigger({
      event: 'article_new_collected',
      recipientId: collection.authorId,
      actorId: article.authorId,
      entities: [
        {
          type: 'target',
          entityTable: 'article',
          entity: collection
        },
        {
          type: 'collection',
          entityTable: 'article',
          entity: article
        }
      ]
    })
  })

  return articleService.dataloader.load(entranceId)
}

export default resolver
