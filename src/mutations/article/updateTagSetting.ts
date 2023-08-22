import type { GQLMutationResolvers } from 'definitions'

import _difference from 'lodash/difference'
import _some from 'lodash/some'
import _uniq from 'lodash/uniq'

import {
  CACHE_KEYWORD,
  NODE_TYPES,
  USER_STATE,
  UPDATE_TAG_SETTING_TYPE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
  TagEditorsReachLimitError,
  TagNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['updateTagSetting'] = async (
  _,
  { input: { id, type, editors } },
  { viewer, dataSources: { systemService, tagService } }
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

  let updatedTag

  switch (type) {
    case UPDATE_TAG_SETTING_TYPE.adopt: {
      // check feature is enabled
      const feature = await systemService.getFeatureFlag('tag_adoption')
      if (
        feature &&
        !(await systemService.isFeatureEnabled(feature.flag, viewer))
      ) {
        throw new ForbiddenError('viewer has no permission')
      }

      // if tag has been adopted, throw error
      if (tag.owner) {
        throw new ForbiddenError('viewer has no permission')
      }

      // update
      updatedTag = await tagService.baseUpdate(tagId, {
        owner: viewer.id,
        editors: _uniq([...tag.editors, viewer.id]),
      })

      break
    }
    case UPDATE_TAG_SETTING_TYPE.leave: {
      // if tag has no owner or owner is not viewer, throw error
      if (!tag.owner || (tag.owner && !isOwner)) {
        throw new ForbiddenError('viewer has no permission')
      }

      // remove viewer from editors
      const newEditors = isMatty
        ? undefined
        : (tag.editors || []).filter((item: string) => item !== viewer.id)

      // update
      updatedTag = await tagService.baseUpdate(tagId, {
        owner: null,
        editors: newEditors,
      })

      break
    }
    case UPDATE_TAG_SETTING_TYPE.add_editor: {
      // only owner can add editors
      if (!isOwner) {
        throw new ForbiddenError('viewer has no permission')
      }
      if (!editors || editors.length === 0) {
        throw new UserInputError('editors are invalid')
      }

      // gather valid editors
      const newEditors =
        (editors
          .map((editor) => {
            const { id: editorId } = fromGlobalId(editor)
            if (!tag.editors.includes(editorId)) {
              return editorId
            }
          })
          .filter((editorId) => editorId !== undefined) as string[]) || []

      // editors composed by 4 editors, matty and owner
      const dedupedEditors = _uniq([...tag.editors, ...newEditors])
      if (dedupedEditors.length > 6) {
        throw new TagEditorsReachLimitError('number of editors reaches limit')
      }

      // update
      updatedTag = await tagService.baseUpdate(tagId, {
        editors: dedupedEditors,
      })

      break
    }
    case UPDATE_TAG_SETTING_TYPE.remove_editor: {
      // only owner can remove editors
      if (!isOwner) {
        throw new ForbiddenError('viewer has no permission')
      }
      if (!editors || editors.length === 0) {
        throw new UserInputError('editors are invalid')
      }

      // gather valid editors
      const removeEditors =
        (editors
          .map((editor) => {
            const { id: editorId } = fromGlobalId(editor)
            if (editorId === tag.owner || editorId === mattyId) {
              return
            }
            return editorId
          })
          .filter((editorId) => editorId !== undefined) as string[]) || []

      // update
      updatedTag = await tagService.baseUpdate(tagId, {
        editors: _difference(tag.editors, removeEditors),
      })
      break
    }
    case UPDATE_TAG_SETTING_TYPE.leave_editor: {
      const isEditor = _some(tag.editors, (editor) => editor === viewer.id)
      if (!isEditor) {
        throw new ForbiddenError('viewer has no permission')
      }
      if (isOwner || isMatty) {
        throw new ForbiddenError('viewer cannot leave')
      }

      // update
      updatedTag = await tagService.baseUpdate(tagId, {
        editors: _difference(tag.editors, [viewer.id]),
      })

      break
    }
    default: {
      throw new UserInputError('unknown update tag type')
    }
  }

  if (updatedTag) {
    // invalidate extra nodes
    updatedTag[CACHE_KEYWORD] = [{ id: viewer.id, type: NODE_TYPES.User }]
  }
  return updatedTag
}

export default resolver
