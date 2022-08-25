import _difference from 'lodash/difference'
import _some from 'lodash/some'
import _uniq from 'lodash/uniq'

import { DB_NOTICE_TYPE, USER_STATE } from 'common/enums'
import { environment } from 'common/environment'
import {
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
  TagNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToDeleteArticlesTagsResolver } from 'definitions'

const resolver: MutationToDeleteArticlesTagsResolver = async (
  root,
  { input: { id, articles } },
  {
    viewer,
    dataSources: {
      articleService,
      notificationService,
      tagService,
      userService,
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (!articles) {
    throw new UserInputError('"articles" is required in update')
  }

  const { id: dbId } = fromGlobalId(id)
  const tag = await tagService.baseFindById(dbId)
  if (!tag) {
    throw new TagNotFoundError('tag not found')
  }

  // delete only allow: owner, editor, matty
  const isOwner = tag.owner === viewer.id
  const isEditor = _some(tag.editors, (editor) => editor === viewer.id)
  const isMatty = viewer.id === environment.mattyId
  const isMaintainer = isOwner || isEditor || isMatty

  if (!isMaintainer) {
    throw new ForbiddenError('only editor, creator and matty can manage tag')
  }

  // compare new and old article ids which have this tag
  const deleteIds = articles.map((articleId) => fromGlobalId(articleId).id)

  // delete unwanted
  await tagService.deleteArticleTagsByArticleIds({
    articleIds: deleteIds,
    tagId: dbId,
  })

  // trigger notification for deleting article tag
  for (const articleId of deleteIds) {
    const article = await articleService.baseFindById(articleId)
    notificationService.trigger({
      event: DB_NOTICE_TYPE.article_tag_has_been_removed,
      recipientId: article.authorId,
      actorId: viewer.id,
      entities: [
        { type: 'target', entityTable: 'article', entity: article },
        {
          type: 'tag',
          entityTable: 'tag',
          entity: tag,
        },
      ],
    })
  }
  return tag
}

export default resolver
