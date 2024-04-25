import type { GQLMutationResolvers } from 'definitions'

import { PUBLISH_STATE, USER_STATE } from 'common/enums'
import {
  DraftNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['publishArticle'] = async (
  _,
  { input: { id, iscnPublish } },
  {
    viewer,
    dataSources: {
      draftService,
      atomService,
      queues: { publicationQueue },
    },
  }
) => {
  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  // retrive data from draft
  const { id: draftDBId } = fromGlobalId(id)
  const draft = await atomService.draftIdLoader.load(draftDBId)
  const isPublished = draft.publishState === PUBLISH_STATE.published

  if (draft.authorId !== viewer.id || (draft.archived && !isPublished)) {
    throw new DraftNotFoundError('draft does not exists')
  }

  if (!draft.title.trim()) {
    throw new UserInputError('title is required')
  }

  if (!draft.content) {
    throw new UserInputError('content is required')
  }

  if (
    draft.publishState === PUBLISH_STATE.pending ||
    (draft.archived && isPublished)
  ) {
    return draft
  }

  const draftPending = await draftService.baseUpdate(draft.id, {
    publishState: PUBLISH_STATE.pending,
    iscnPublish,
  })

  // add job to queue
  publicationQueue.publishArticle({ draftId: draftDBId, iscnPublish })

  return draftPending
}

export default resolver
