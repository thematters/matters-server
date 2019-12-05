import _difference from 'lodash/difference'

import {
  AuthenticationError,
  ForbiddenError,
  TagNotFoundError,
  UserInputError
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToAddArticleTagsResolver } from 'definitions'

const resolver: MutationToAddArticleTagsResolver = async (
  root,
  { input: { id, articles } },
  { viewer, dataSources: { articleService, notificationService, tagService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('viewer has no permission')
  }

  if (!articles) {
    throw new UserInputError('"articles" is required in update')
  }

  // temporarily safety check
  if (viewer.email !== 'hi@matters.news') {
    throw new ForbiddenError('only Matty can manage tag at this moment')
  }

  const { id: dbId } = fromGlobalId(id)
  const tag = await tagService.baseFindById(dbId)
  if (!tag) {
    throw new TagNotFoundError('tag not found')
  }

  // compare new and old article ids which have this tag
  const oldIds = await tagService.findArticleIdsByTagIds([dbId])
  const newIds = articles.map(articleId => fromGlobalId(articleId).id)
  const addIds = _difference(newIds, oldIds)

  await tagService.createArticleTags({ articleIds: addIds, tagIds: [dbId] })

  // trigger notification for adding article tag
  addIds.forEach(async (articleId: string) => {
    const article = await articleService.baseFindById(articleId)
    notificationService.trigger({
      event: 'article_tag_has_been_added',
      recipientId: article.authorId,
      actorId: viewer.id,
      entities: [
        {
          type: 'target',
          entityTable: 'article',
          entity: article
        },
        {
          type: 'tag',
          entityTable: 'tag',
          entity: tag
        }
      ]
    })
  })
  return tag
}

export default resolver
