import type { GQLMutationResolvers } from 'definitions'

import _some from 'lodash/some'

import { USER_STATE } from 'common/enums'
import { environment } from 'common/environment'
import {
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
  TagNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['updateArticlesTags'] = async (
  root,
  { input: { id, articles, isSelected } },
  { viewer, dataSources: { tagService } }
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

  return tag
}

export default resolver
