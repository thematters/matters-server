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
import { ArticleService, NotificationService } from 'connectors'
import { MutationToAddArticlesTagsResolver } from 'definitions'

const triggerNotice = async ({
  articleId,
  articleService,
  notificationService,
  tag,
  viewerId,
  isOwner,
}: {
  articleId: string
  articleService: InstanceType<typeof ArticleService>
  notificationService: InstanceType<typeof NotificationService>
  tag: any
  viewerId: string
  isOwner: boolean
}) => {
  const { mattyId } = environment
  const article = await articleService.baseFindById(articleId)
  const editors = (tag.editors || []).filter((id: string) => id !== mattyId)
  const owner = tag.owner ? [`${tag.owner}`] : []
  const users = [article.authorId, ...(isOwner ? editors : owner)].filter(
    (id) => id !== viewerId
  )

  users.map((user) => {
    notificationService.trigger({
      event: DB_NOTICE_TYPE.article_tag_has_been_added,
      recipientId: user,
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

  // add only allow: owner, editor, matty
  const isOwner = tag.owner === viewer.id
  const isEditor = _some(tag.editors, (editor) => editor === viewer.id)
  const isMatty = viewer.id === environment.mattyId
  const isMaintainer = isOwner || isEditor || isMatty

  if (!isMaintainer && selected) {
    throw new ForbiddenError('not allow add tag to article')
  }

  // compare new and old article ids that have this tag (dedupe)
  const oldIds = await tagService.findArticleIdsByTagIds([dbId])
  const newIds = articles.map((articleId) => fromGlobalId(articleId).id)
  const addIds = _difference(newIds, oldIds)

  // not-maintainer can only add his/her own articles
  if (!isMaintainer) {
    const count = await articleService.countByIdsAndAuthor({
      ids: addIds,
      authorId: viewer.id,
    })

    if (count !== addIds.length) {
      throw new ForbiddenError('not allow add tag to article')
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
    for (const articleId of addIds) {
      await triggerNotice({
        articleId,
        articleService,
        notificationService,
        tag,
        viewerId: viewer.id,
        isOwner,
      })
    }
  }

  return tag
}

export default resolver
