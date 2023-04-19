import { v4 } from 'uuid'

import { ARTICLE_STATE, PUBLISH_STATE } from 'common/enums'
import { knex } from 'connectors'
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
    const { draft, content, contentHTML } = await createPendingDraft()
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

    expect(updatedDraft.content).toBe(contentHTML)
    expect(updatedDraft.contentMd.includes(content)).toBeTruthy()
    expect(updatedDraft.publishState).toBe(PUBLISH_STATE.published)
    expect(updatedArticle.state).toBe(ARTICLE_STATE.active)
  })

  test('publish pending draft concurrently', async () => {
    const { draft } = await createPendingDraft()
    const job1 = await publicationQueue.publishArticle({
      draftId: draft.id,
    })
    const job2 = await publicationQueue.publishArticle({
      draftId: draft.id,
    })
    await Promise.all([job1.finished(), job2.finished()])
    const articleCount = await knex('article')
      .where('draft_id', draft.id)
      .count()
    expect(articleCount[0].count).toBe('2')
  })

  test('publish pending draft unsuccessfully', async () => {
    // mock
    publicationQueue.userService.baseFindById = async (id) => {
      console.log('mocked publicationQueue.userService.baseFindById is called')
      throw Error('mock error in publicationQueue test')
    }
    const { draft } = await createPendingDraft()
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

const createPendingDraft = async () => {
  const content = Math.random().toString()
  const contentHTML = `<p>${content} <strong>abc</strong></p>`

  return {
    draft: await publicationQueue.draftService.baseCreate({
      authorId: '1',
      uuid: v4(),
      title: 'test title',
      summary: 'test summary',
      content: contentHTML,
      publishState: PUBLISH_STATE.pending,
    }),
    content,
    contentHTML,
  }
}
