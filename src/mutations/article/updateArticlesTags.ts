import _some from 'lodash/some'
import _uniq from 'lodash/uniq'

import {
  AuthenticationError,
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

  // update only allow: editor, creator, matty
  const isEditor = _some(tag.editors, (editor) => editor === viewer.id)
  const isCreator = tag.creator === viewer.id
  const isMatty = viewer.email === admin
  const isMaintainer =
    isEditor || (normalEditors.length === 0 && isCreator) || isMatty

  if (!isMaintainer) {
    throw new ForbiddenError('only editor, creator and matty can manage tag')
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
