import _difference from 'lodash/difference'
import _some from 'lodash/some'
import _uniq from 'lodash/uniq'

import {
  CACHE_KEYWORD,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  USER_STATE,
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
import {
  GQLUpdateTagSettingType as UpdateType,
  MutationToUpdateTagSettingResolver,
} from 'definitions'

const resolver: MutationToUpdateTagSettingResolver = async (
  _,
  { input: { id, type, editors } },
  {
    viewer,
    dataSources: {
      notificationService,
      systemService,
      tagService,
      userService,
    },
  }
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
    case UpdateType.adopt: {
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

      // auto follow current tag
      await tagService.follow({ targetId: tag.id, userId: viewer.id })

      // send mails
      notificationService.mail.sendAdoptTag({
        to: viewer.email,
        language: viewer.language,
        recipient: {
          displayName: viewer.displayName,
          userName: viewer.userName,
        },
        tag: { id, content: tag.content },
      })

      // send notices
      const participants = await tagService.findParticipants({ id: tag.id })

      participants.map(async (participant) => {
        await notificationService.trigger({
          event: DB_NOTICE_TYPE.tag_adoption,
          recipientId: participant.authorId,
          actorId: viewer.id,
          entities: [
            {
              type: 'target',
              entityTable: 'tag',
              entity: tag,
            },
          ],
        })
      })
      break
    }
    case UpdateType.leave: {
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

      // send notices
      if (newEditors && newEditors.length > 0) {
        newEditors.map((editor: string) => {
          notificationService.trigger({
            event: DB_NOTICE_TYPE.tag_leave,
            recipientId: editor,
            actorId: viewer.id,
            entities: [
              {
                type: 'target',
                entityTable: 'tag',
                entity: tag,
              },
            ],
          })
        })
      }
      break
    }
    case UpdateType.add_editor: {
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

      // auto follow current tag
      await Promise.all(
        newEditors.map((editorId) =>
          tagService.follow({ targetId: tag.id, userId: editorId })
        )
      )

      // send emails and notices
      const recipients = (await userService.dataloader.loadMany(
        newEditors
      )) as Array<Record<string, any>>

      recipients.map((recipient) => {
        notificationService.mail.sendAssignAsTagEditor({
          to: recipient.email,
          language: recipient.language,
          recipient: {
            displayName: recipient.displayName,
            userName: recipient.userName,
          },
          sender: {
            displayName: viewer.displayName,
            userName: viewer.userName,
          },
          tag: { id, content: tag.content },
        })

        notificationService.trigger({
          event: DB_NOTICE_TYPE.tag_add_editor,
          recipientId: recipient.id,
          actorId: viewer.id,
          entities: [
            {
              type: 'target',
              entityTable: 'tag',
              entity: tag,
            },
          ],
        })
      })
      break
    }
    case UpdateType.remove_editor: {
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
    case UpdateType.leave_editor: {
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

      // send notice
      if (tag.owner) {
        notificationService.trigger({
          event: DB_NOTICE_TYPE.tag_leave_editor,
          recipientId: tag.owner,
          actorId: viewer.id,
          entities: [
            {
              type: 'target',
              entityTable: 'tag',
              entity: tag,
            },
          ],
        })
      }
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
