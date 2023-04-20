import { v4 } from 'uuid'

import { ARTICLE_STATE, PUBLISH_STATE } from 'common/enums'
import { DraftService, knex } from 'connectors'
import { PublicationQueue } from 'connectors/queue'

describe('queue.publishArticle', () => {
  let queue: PublicationQueue
  beforeAll(() => {
    queue = new PublicationQueue()
  })

  test('publish not pending draft', async () => {
    const notPendingDraftId = '1'
    const draft = await queue.draftService.baseFindById(notPendingDraftId)
    expect(draft.state).not.toBe(PUBLISH_STATE.pending)

    const job = await queue.publishArticle({
      draftId: notPendingDraftId,
    })
    await job.finished()
    expect(await job.getState()).toBe('completed')
  })

  test('publish pending draft successfully', async () => {
    const { draft, content, contentHTML } = await createPendingDraft()
    const job = await queue.publishArticle({
      draftId: draft.id,
    })
    await job.finished()
    expect(await job.getState()).toBe('completed')
    const updatedDraft = await queue.draftService.baseFindById(draft.id)
    const updatedArticle = await queue.articleService.baseFindById(
      updatedDraft.articleId
    )

    expect(updatedDraft.content).toBe(contentHTML)
    expect(updatedDraft.contentMd.includes(content)).toBeTruthy()
    expect(updatedDraft.publishState).toBe(PUBLISH_STATE.published)
    expect(updatedArticle.state).toBe(ARTICLE_STATE.active)
  })

  test('publish pending draft concurrently', async () => {
    const { draft } = await createPendingDraft()
    const job1 = await queue.publishArticle({
      draftId: draft.id,
    })
    const job2 = await queue.publishArticle({
      draftId: draft.id,
    })
    await Promise.all([job1.finished(), job2.finished()])
    const articleCount = await knex('article')
      .where('draft_id', draft.id)
      .count()
    // only one article is created
    expect(articleCount[0].count).toBe('1')
  })

  test('publish pending draft unsuccessfully', async () => {
    // mock
    queue.userService.baseFindById = async (id) => {
      console.log('mocked queue.userService.baseFindById is called')
      throw Error('mock error in queue test')
    }
    const { draft } = await createPendingDraft()
    const job = await queue.publishArticle({
      draftId: draft.id,
    })
    try {
      await job.finished()
    } catch {
      // pass
    }
    expect(await job.getState()).toBe('failed')

    const updatedDraft = await queue.draftService.baseFindById(draft.id)
    const updatedArticle = await queue.articleService.baseFindById(
      updatedDraft.articleId
    )

    expect(updatedDraft.publishState).toBe(PUBLISH_STATE.error)
    expect(updatedArticle.state).toBe(ARTICLE_STATE.error)
  })
})

const createPendingDraft = async () => {
  const content = Math.random().toString()
  const contentHTML = `<p>${content} <strong>abc</strong></p>`
  const draftService = new DraftService()

  return {
    draft: await draftService.baseCreate({
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
