import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { PUBLISH_STATE } from 'common/enums'

import { publicationQueue } from 'connectors/queue'

const resolver: Resolver = async (
  _,
  { input: { id, delay } },
  { viewer, dataSources: { draftService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  // retrive data from draft
  const { id: draftDBId } = fromGlobalId(id)
  const draft = await draftService.dataloader.load(draftDBId)

  if (
    draft.authorId !== viewer.id ||
    draft.archived ||
    draft.publishState === PUBLISH_STATE.published
  ) {
    throw new Error('draft does not exists') // TODO
  }

  if (draft.publishState === PUBLISH_STATE.pending) {
    return draft
  }

  const draftPending = await draftService.baseUpdateById(draft.id, {
    publishState: PUBLISH_STATE.pending
  })

  // add job to queue
  publicationQueue.publishArticle({ draftId: draftDBId, delay })

  return draftPending
}

export default resolver
