import _some from 'lodash/some.js'
import _uniq from 'lodash/uniq.js'

import { DB_NOTICE_TYPE, USER_STATE } from 'common/enums/index.js'
import { environment } from 'common/environment.js'
import {
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
  TagNotFoundError,
  UserInputError,
} from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
import { ArticleService, NotificationService } from 'connectors/index.js'
import { MutationToUpdateArticlesTagsResolver } from 'definitions'

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
    (user) => user !== viewerId
  )

  users.map((user) => {
    notificationService.trigger({
      event: DB_NOTICE_TYPE.article_tag_has_been_added,
      recipientId: user,
      actorId: viewerId,
      entities: [
        { type: 'target', entityTable: 'article', entity: article },
        {
          type: 'tag',
          entityTable: 'tag',
          entity: tag,
        },
      ],
    })
  })
}

const resolver: MutationToUpdateArticlesTagsResolver = async (
  root,
  { input: { id, articles, isSelected } },
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

  // update only allow: owner, editor, matty
  const isOwner = tag.owner === viewer.id
  const isEditor = _some(tag.editors, (editor) => editor === viewer.id)
  const isMatty = viewer.id === environment.mattyId
  const isMaintainer = isOwner || isEditor || isMatty

  if (!isMaintainer) {
    throw new ForbiddenError('only owner, editor and matty can manage tag')
  }

  // set article as selected or not
  const { id: articleId } = fromGlobalId(articles[0])
  await tagService.putArticleTag({
    articleId,
    tagId: dbId,
    data: { selected: isSelected },
  })

  // trigger notification for adding article tag
  if (isSelected) {
    await triggerNotice({
      articleId,
      articleService,
      notificationService,
      tag,
      viewerId: viewer.id,
      isOwner,
    })
  }

  return tag
}

export default resolver
