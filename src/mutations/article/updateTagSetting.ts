import _difference from 'lodash/difference'
import _some from 'lodash/some'
import _uniq from 'lodash/uniq'

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
  { input: { id, type, editors } },
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

  const { mattyId } = environment
  const isOwner = tag.owner === viewer.id
  const isMatty = viewer.id === mattyId

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

      // auto follow current tag
      await tagService.follow({ targetId: tag.id, userId: viewer.id })

      params = { owner: viewer.id, editors: _uniq([...tag.editors, viewer.id]) }
      break
    }
    case GQLUpdateTagSettingType.leave: {
      // if tag has no owner or owner is not viewer, throw error
      if (!tag.owner || (tag.owner && tag.owner !== viewer.id)) {
        throw new ForbiddenError('viewer has no permission')
      }

      // remove viewer from editors
      const newEditors = isMatty
        ? undefined
        : (tag.editors || []).filter((item: string) => item !== viewer.id)
      params = { owner: null, editors: newEditors }
      break
    }
    case GQLUpdateTagSettingType.add_editor: {
      // only owner can add editors
      if (!isOwner) {
        throw new ForbiddenError('viewer has no permission')
      }
      if (!editors || editors.length === 0) {
        throw new UserInputError('editors are invalid')
      }

      // gather valid editors
      const newEditors = editors.map(async (editor) => {
        const { id: editorId } = fromGlobalId(editor)
        return editorId
      }).filter((editorId) => editorId !== undefined)

      // editors composed by 4 editors, matty and owner
      if (_uniq([...tag.editors, ...newEditors]).length > 6) {
        throw new UserInputError('number of editors reaches limit')
      }
      params = { editors: _uniq([...tag.editors, ...newEditors]) }
      break
    }
    case GQLUpdateTagSettingType.remove_editor: {
      // only owner can remove editors
      if (!isOwner) {
        throw new ForbiddenError('viewer has no permission')
      }
      if (!editors || editors.length === 0) {
        throw new UserInputError('editors are invalid')
      }

      // gather valid editors
      const removeEditors = editors
        .map((editor) => {
          const { id: editorId } = fromGlobalId(editor)
          if (editorId === tag.owner || editorId === mattyId) {
            return
          }
          return editorId
        })
        .filter((editorId) => editorId !== undefined)
      params = { editors: _difference(tag.editors, removeEditors) }
      break
    }
    case GQLUpdateTagSettingType.leave_editor: {
      const isEditor = _some(tag.editors, (editor) => editor === viewer.id)
      if (!isEditor) {
        throw new ForbiddenError('viewer has no permission')
      }
      if (isOwner || isMatty) {
        throw new ForbiddenError('viewer cannot leave')
      }
      params = { editors: _difference(tag.editors, [viewer.id]) }
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
