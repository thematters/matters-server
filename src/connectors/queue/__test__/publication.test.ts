import { PUBLISH_STATE } from 'common/enums'
import { publicationQueue } from 'connectors/queue'

describe('publicationQueue.publishArticle', () => {
  test('publish not pending draft', async () => {
    const notPendingDraftId = '1'
    const draft = await publicationQueue.draftService.baseFindById(
      notPendingDraftId
    )
    expect(draft.state).not.toBe(PUBLISH_STATE.pending)

    const job = await publicationQueue.publishArticle({
      draftId: notPendingDraftId,
    })
    await job.finished()
  })
})
