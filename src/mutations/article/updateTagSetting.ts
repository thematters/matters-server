import _uniq from 'lodash/uniq'
import _without from 'lodash/without'

import { CACHE_KEYWORD, NODE_TYPES, USER_STATE } from 'common/enums'
import { environment } from 'common/environment'
import {
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
  TagNotFoundError,
  UserInputError,
  UserNotFoundError,
} from 'common/errors'
import { fromGlobalId, isFeatureEnabled } from 'common/utils'
import {
  GQLUpdateTagSettingType,
  MutationToUpdateTagSettingResolver,
} from 'definitions'

const resolver: MutationToUpdateTagSettingResolver = async (
  _,
  { input: { id, type, editor } },
  { viewer, dataSources: { systemService, tagService, userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('viewer has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const { id: tagId } = fromGlobalId(id)
  const tag = await tagService.baseFindById(tagId)

  if (!tag) {
    throw new TagNotFoundError('tag not found')
  }

  const isOwner = tag.owner === viewer.id

  let params: Record<string, any> = {}
  switch (type) {
    case GQLUpdateTagSettingType.adopt: {
      // check feature is enabled
      const feature = await systemService.getFeatureFlag('tag_adoption')
      if (feature && !isFeatureEnabled(feature.flag, viewer)) {
        throw new ForbiddenError('viewer has no permission')
      }

      // if tag has been adopted, throw error
      if (tag.owner) {
        throw new ForbiddenError('viewer has no permission')
      }

      params = { owner: viewer.id, editors: _uniq([...tag.editors, viewer.id]) }
      break
    }
    case GQLUpdateTagSettingType.leave: {
      // if tag has no owner or owner is not viewer, throw error
      if (!tag.owner || (tag.owner && tag.owner !== viewer.id)) {
        throw new ForbiddenError('viewer has no permission')
      }

      const isMatty = viewer.id === environment.mattyId
      const editors = isMatty
        ? undefined
        : (tag.editors || []).filter((item: string) => item !== viewer.id)
      params = { owner: null, editors }
      break
    }
    case GQLUpdateTagSettingType.add_editor: {
      if (!isOwner) {
        throw new ForbiddenError('viewer has no permission')
      }
      if (!editor) {
        throw new UserInputError('editor is invalid')
      }

      const editors = _without(tag.editors, tag.owner, environment.mattyId)
      if (editors.length >= 4) {
        throw new UserInputError('number of editors reaches limit')
      }

      const { id: editorId } = fromGlobalId(editor)
      if (isOwner && viewer.id === editorId) {
        throw new UserInputError('cannot add self')
      }
      const user = await userService.baseFindById(editorId)
      if (!user) {
        throw new UserNotFoundError('editor not found')
      }
      params = { editors: _uniq([...editors, editorId]) }
      break
    }
    case GQLUpdateTagSettingType.remove_editor: {
      if (!isOwner) {
        throw new ForbiddenError('viewer has no permission')
      }
      if (!editor) {
        throw new UserInputError('editor is invalid')
      }

      const { id: editorId } = fromGlobalId(editor)
      if (isOwner && viewer.id === editorId) {
        throw new UserInputError('cannot remove self')
      }
      const user = await userService.baseFindById(editorId)
      if (!user) {
        throw new UserNotFoundError('editor not found')
      }
      const editors = _without(tag.editors, editorId)
      params = { editors }
      break
    }
    default: {
      throw new UserInputError('unknown update tag type')
      break
    }
  }

  const updatedTag = await tagService.baseUpdate(tagId, params)

  // invalidate extra nodes
  updatedTag[CACHE_KEYWORD] = [{ id: viewer.id, type: NODE_TYPES.user }]
  return updatedTag
}

export default resolver
