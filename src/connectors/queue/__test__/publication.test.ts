import { v4 } from 'uuid'

import { ARTICLE_STATE, PUBLISH_STATE } from 'common/enums'
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
    expect(await job.getState()).toBe('completed')
  })
  test('publish pending draft successfully', async () => {
    const draft = await createPendingDraft()
    const job = await publicationQueue.publishArticle({
      draftId: draft.id,
    })
    await job.finished()
    expect(await job.getState()).toBe('completed')
    const updatedDraft = await publicationQueue.draftService.baseFindById(
      draft.id
    )
    const updatedArticle = await publicationQueue.articleService.baseFindById(
      updatedDraft.articleId
    )
    expect(updatedDraft.publishState).toBe(PUBLISH_STATE.published)
    expect(updatedArticle.state).toBe(ARTICLE_STATE.active)
  })
  test('publish pending draft unsuccessfully', async () => {
    // mock
    publicationQueue.userService.baseFindById = async (id) => {
      console.log('mocked publicationQueue.userService.baseFindById is called')
      throw Error('mock error in publicationQueue test')
    }
    const draft = await createPendingDraft()
    const job = await publicationQueue.publishArticle({
      draftId: draft.id,
    })
    try {
      await job.finished()
    } catch {
      // pass
    }
    expect(await job.getState()).toBe('failed')

    const updatedDraft = await publicationQueue.draftService.baseFindById(
      draft.id
    )
    const updatedArticle = await publicationQueue.articleService.baseFindById(
      updatedDraft.articleId
    )

    expect(updatedDraft.publishState).toBe(PUBLISH_STATE.error)
    expect(updatedArticle.state).toBe(ARTICLE_STATE.error)
  })
})

const createPendingDraft = async () =>
  publicationQueue.draftService.baseCreate({
    authorId: '1',
    uuid: v4(),
    title: 'test title',
    summary: 'test summary',
    content: 'test content',
    publishState: PUBLISH_STATE.pending,
  })
