import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { PUBLISH_STATE } from 'common/enums'

import { publicationQueue } from 'connectors/queue'
import { PRIORITY, JOB } from 'connectors/queue/utils'

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
  if (draft.authorId !== viewer.id || draft.archived) {
    throw new Error('draft does not exists') // TODO
  }

  const draftPending = await draftService.baseUpdateById(draft.id, {
    publishState: PUBLISH_STATE.pending
  })

  // add job to queue
  await publicationQueue.q.add(
    JOB.publish,
    { draftId: draftDBId },
    {
      repeat: { limit: 1, every: delay | (1000 * 60 * 2 + 2000) },
      priority: PRIORITY.CRITICAL
    } // wait for 2 minutes + 2 sec buffer
  )
  console.log(`Publication queue for draft ${draftDBId} added.`)

  return draftPending
}

export default resolver
