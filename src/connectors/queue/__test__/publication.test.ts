import type { Connections } from 'definitions'
import type { Knex } from 'knex'

import Redis from 'ioredis'

import { ARTICLE_STATE, PUBLISH_STATE } from 'common/enums'
import { environment } from 'common/environment'
import { DraftService, ArticleService } from 'connectors'
import { PublicationQueue } from 'connectors/queue'

import { genConnections, closeConnections } from '../../__test__/utils'

describe('publicationQueue.publishArticle', () => {
  let connections: Connections
  let queue: PublicationQueue
  let draftService: DraftService
  let articleService: ArticleService
  let knex: Knex
  beforeAll(async () => {
    connections = await genConnections()
    knex = connections.knex
    draftService = new DraftService(connections)
    articleService = new ArticleService(connections)
    queue = new PublicationQueue(connections, {
      createClient: () => {
        return new Redis({
          host: environment.queueHost,
          port: environment.queuePort,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        })
      },
    })
  }, 50000)

  afterAll(async () => {
    await closeConnections(connections)
  })

  test('publish not pending draft', async () => {
    const notPendingDraftId = '1'
    const draft = await draftService.baseFindById(notPendingDraftId)
    expect(draft.publishState).not.toBe(PUBLISH_STATE.pending)

    const job = await queue.publishArticle({
      draftId: notPendingDraftId,
    })
    await job.finished()
    expect(await job.getState()).toBe('completed')
  })

  test('publish pending draft successfully', async () => {
    const { draft, content, contentHTML } = await createPendingDraft(
      draftService
    )
    const job = await queue.publishArticle({
      draftId: draft.id,
    })
    await job.finished()
    expect(await job.getState()).toBe('completed')
    const updatedDraft = await draftService.baseFindById(draft.id)
    const updatedArticle = await articleService.baseFindById(
      updatedDraft.articleId as string
    )
    expect(updatedDraft.content).toBe(contentHTML)
    expect(updatedDraft.contentMd?.includes(content)).toBeTruthy()
    expect(updatedDraft.publishState).toBe(PUBLISH_STATE.published)
    expect(updatedArticle.state).toBe(ARTICLE_STATE.active)
  })

  test('publish pending draft concurrently', async () => {
    const { draft } = await createPendingDraft(draftService)
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

  test.skip('publish pending draft unsuccessfully', async () => {
    // TODO: fix this test to make queue.publishArticle throw error
    const { draft } = await createPendingDraft(draftService)
    const job = await queue.publishArticle({
      draftId: draft.id,
    })
    try {
      await job.finished()
    } catch {
      // pass
    }
    expect(await job.getState()).toBe('failed')

    const updatedDraft = await draftService.baseFindById(draft.id)
    const updatedArticle = await articleService.baseFindById(
      updatedDraft.articleId as string
    )
    expect(updatedDraft.publishState).toBe(PUBLISH_STATE.pending)
    expect(updatedArticle).toBeUndefined()
  })
})

const createPendingDraft = async (draftService: DraftService) => {
  const content = Math.random().toString()
  const contentHTML = `<p>${content} <strong>abc</strong></p>`

  return {
    draft: await draftService.baseCreate({
      authorId: '1',
      title: 'test title',
      summary: 'test summary',
      content: contentHTML,
      publishState: PUBLISH_STATE.pending,
    }),
    content,
    contentHTML,
  }
}
