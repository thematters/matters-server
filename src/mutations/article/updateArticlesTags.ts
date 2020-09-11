import _some from 'lodash/some'
import _uniq from 'lodash/uniq'

import { USER_STATE } from 'common/enums'
import {
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
  TagNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { ArticleService, NotificationService } from 'connectors'
import { MutationToUpdateArticlesTagsResolver } from 'definitions'

const triggerNotice = async ({
  articleId,
  articleService,
  notificationService,
  selected,
  tag,
  viewerId,
}: {
  articleId: string
  articleService: InstanceType<typeof ArticleService>
  notificationService: InstanceType<typeof NotificationService>
  selected: boolean
  tag: any
  viewerId: string
}) => {
  const article = await articleService.baseFindById(articleId)
  notificationService.trigger({
    event:
      selected === true
        ? 'article_tag_has_been_added'
        : 'article_tag_has_been_unselected',
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
  const isMatty = viewer.email === 'hi@matters.news'
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
  await triggerNotice({
    articleId,
    articleService,
    notificationService,
    selected: isSelected,
    tag,
    viewerId: viewer.id,
  })

  return tag
}

export default resolver
