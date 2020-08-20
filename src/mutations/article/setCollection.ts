import { difference } from 'lodash'

import { USER_STATE } from 'common/enums'
import {
  AuthenticationError,
  EntityNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToSetCollectionResolver } from 'definitions'

const resolver: MutationToSetCollectionResolver = async (
  root,
  { input: { id, collection } },
  { viewer, dataSources: { articleService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const entranceId = fromGlobalId(id).id
  const article = await articleService.baseFindById(entranceId)
  if (!article) {
    throw new EntityNotFoundError('target does not exist')
  }

  if (article.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  // Compare new and old collections
  const oldIds = (
    await articleService.findCollections({
      entranceId,
      limit: null,
    })
  ).map(({ articleId }: any) => articleId)
  const newIds = collection.map((articleId) => fromGlobalId(articleId).id)
  const addItems: any[] = []
  const updateItems: any[] = []
  const deleteItems: any[] = []
  const diff = difference(newIds, oldIds)

  // Gather data
  newIds.map((articleId: string, index: number) => {
    const indexOf = oldIds.indexOf(articleId)
    if (indexOf < 0) {
      addItems.push({ entranceId, articleId, order: index })
    }
    if (indexOf >= 0 && index !== indexOf) {
      updateItems.push({ entranceId, articleId, order: index })
    }
  })

  // Add and update
  await Promise.all([
    ...addItems.map((data: any) => articleService.insertCollection(data)),
    ...updateItems.map((data: any) =>
      articleService.updateCollectionOrder(data)
    ),
  ])

  // Delete unwanted
  await articleService.deleteCollectionByArticleIds({
    entranceId,
    articleIds: difference(oldIds, newIds),
  })

  // trigger notifications
  diff.forEach(async (articleId: string) => {
    const targetCollection = await articleService.baseFindById(articleId)
    notificationService.trigger({
      event: 'article_new_collected',
      recipientId: targetCollection.authorId,
      actorId: article.authorId,
      entities: [
        {
          type: 'target',
          entityTable: 'article',
          entity: targetCollection,
        },
        {
          type: 'collection',
          entityTable: 'article',
          entity: article,
        },
      ],
    })
  })

  return articleService.dataloader.load(entranceId)
}

export default resolver
