import type { GQLMutationResolvers } from 'definitions'

import _difference from 'lodash/difference'
import _some from 'lodash/some'

import { MAX_TAGS_PER_ARTICLE_LIMIT, USER_STATE } from 'common/enums'
import { environment } from 'common/environment'
import {
  ForbiddenByStateError,
  ForbiddenError,
  TagNotFoundError,
  TooManyTagsForArticleError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['addArticlesTags'] = async (
  _,
  { input: { id, articles, selected } },
  { viewer, dataSources: { atomService, articleService, tagService } }
) => {
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
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

  if (!isMatty && tag.id === environment.mattyChoiceTagId) {
    throw new ForbiddenError('not allow to add official tag')
  }

  // compare new and old article ids that have this tag (dedupe)
  const oldIds = await tagService.findArticleIdsByTagIds([dbId])
  const newIds = articles.map((articleId) => fromGlobalId(articleId).id)
  const addIds = _difference(newIds, oldIds)

  // not-maintainer can only add his/her own articles
  if (!isMaintainer) {
    const count = await atomService.count({
      table: 'article',
      where: { authorId: viewer.id },
      whereIn: ['id', addIds],
    })
    if (count !== addIds.length) {
      throw new ForbiddenError('not allow add tag to article')
    }
  }

  // check article tags
  for (const articleId of addIds) {
    const tagIds = await articleService.findTagIds({ id: articleId })

    if (tagIds.length > MAX_TAGS_PER_ARTICLE_LIMIT - 1) {
      throw new TooManyTagsForArticleError(
        `not allow more than ${MAX_TAGS_PER_ARTICLE_LIMIT} tags on article ${articleId}`
      )
    }
  }

  // add tag to articles
  await tagService.createArticleTags({
    articleIds: addIds,
    creator: viewer.id,
    tagIds: [dbId],
    selected,
  })

  return tag
}

export default resolver
