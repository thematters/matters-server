import _difference from 'lodash/difference'
import _some from 'lodash/some'
import _uniq from 'lodash/uniq'

import {
  AuthenticationError,
  NotAllowAddTagError,
  TagNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { ArticleService, NotificationService } from 'connectors'
import { MutationToAddArticlesTagsResolver } from 'definitions'

const triggerNotice = async ({
  articleId,
  articleService,
  notificationService,
  tag,
  viewerId,
}: {
  articleId: string
  articleService: InstanceType<typeof ArticleService>
  notificationService: InstanceType<typeof NotificationService>
  tag: any
  viewerId: string
}) => {
  const article = await articleService.baseFindById(articleId)
  notificationService.trigger({
    event: 'article_tag_has_been_added',
    recipientId: article.authorId,
    actorId: viewerId,
    entities: [
      {
        type: 'target',
        entityTable: 'article',
        entity: article,
      },
      {
        type: 'tag',
        entityTable: 'tag',
        entity: tag,
      },
    ],
  })
}

const resolver: MutationToAddArticlesTagsResolver = async (
  root,
  { input: { id, articles, selected } },
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
    throw new AuthenticationError('viewer has no permission')
  }

  if (!articles) {
    throw new UserInputError('"articles" is required in update')
  }

  const { id: dbId } = fromGlobalId(id)
  const tag = await tagService.baseFindById(dbId)
  if (!tag) {
    throw new TagNotFoundError('tag not found')
  }

  const admin = 'hi@matters.news'
  const normalEditors = (await userService.baseFindByIds(tag.editors)).filter(
    (user) => user.email !== admin
  )

  // define permission
  const isEditor = _some(tag.editors, (editor) => editor === viewer.id)
  const isCreator = tag.creator === viewer.id
  const isMatty = viewer.email === admin
  const isMaintainer =
    isEditor || (normalEditors.length === 0 && isCreator) || isMatty

  // compare new and old article ids that have this tag (dedupe)
  const oldIds = await tagService.findArticleIdsByTagIds([dbId])
  const newIds = articles.map((articleId) => fromGlobalId(articleId).id)
  const addIds = _difference(newIds, oldIds)

  // not-maintainer can only add his/her articles
  if (!isMaintainer) {
    const count = await articleService.countByIdsAndAuthor({
      ids: addIds,
      authorId: viewer.id,
    })

    if (count !== addIds.length) {
      throw new NotAllowAddTagError('not allow add tag to article')
    }
  }

  await tagService.createArticleTags({
    articleIds: addIds,
    creator: viewer.id,
    tagIds: [dbId],
    selected,
  })

  // trigger notification for adding article tag by maintainer
  if (isMaintainer) {
    addIds.forEach(async (articleId: string) => {
      await triggerNotice({
        articleId,
        articleService,
        notificationService,
        tag,
        viewerId: viewer.id,
      })
    })
  }

  // add creator if not listed in editors
  if (!isEditor && !isMatty && isCreator) {
    const updatedTag = await tagService.baseUpdate(tag.id, {
      editors: _uniq([...tag.editors, viewer.id]),
    })
    return updatedTag
  }

  return tag
}

export default resolver
