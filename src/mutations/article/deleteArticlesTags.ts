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

const resolver: GQLMutationResolvers['deleteArticlesTags'] = async (
  root,
  { input: { id, articles } },
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

  return tag
}

export default resolver
