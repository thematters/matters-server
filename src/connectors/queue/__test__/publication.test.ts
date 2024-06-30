import type { Connections } from 'definitions'
import type { Knex } from 'knex'

import { ARTICLE_STATE, PUBLISH_STATE } from 'common/enums'
import { AtomService } from 'connectors'
import { PublicationQueue } from 'connectors/queue'

import { genConnections, closeConnections } from '../../__test__/utils'

describe('publicationQueue.publishArticle', () => {
  let connections: Connections
  let queue: PublicationQueue
  let atomService: AtomService
  let knex: Knex
  beforeAll(async () => {
    connections = await genConnections()
    knex = connections.knex
    atomService = new AtomService(connections)
    queue = new PublicationQueue(connections)
  }, 50000)

  afterAll(async () => {
    await closeConnections(connections)
  })

  test('publish not pending draft', async () => {
    const notPendingDraftId = '1'
    const draft = await atomService.findUnique({
      table: 'draft',
      where: { id: notPendingDraftId },
    })
    expect(draft.publishState).not.toBe(PUBLISH_STATE.pending)

    const job = await queue.publishArticle({
      draftId: notPendingDraftId,
    })
    await job.finished()
    expect(await job.getState()).toBe('completed')
  })

  test('publish pending draft successfully', async () => {
    const { draft } = await createPendingDraft(atomService)
    const job = await queue.publishArticle({
      draftId: draft.id,
    })
    await job.finished()
    expect(await job.getState()).toBe('completed')

    const updatedDraft = await atomService.findUnique({
      table: 'draft',
      where: { id: draft.id },
    })
    const updatedArticle = await atomService.findUnique({
      table: 'article',
      where: { id: updatedDraft.articleId as string },
    })
    expect(updatedDraft.publishState).toBe(PUBLISH_STATE.published)
    expect(updatedArticle.state).toBe(ARTICLE_STATE.active)

    // article connections are handled
    const connections = await atomService.findMany({
      table: 'article_connection',
      where: { entranceId: updatedArticle.id },
    })
    expect(connections).toHaveLength(3)
  })

  test('publish pending draft concurrently', async () => {
    const countBefore = (await knex('article').count().first())!.count
    const { draft } = await createPendingDraft(atomService)
    const job1 = await queue.publishArticle({
      draftId: draft.id,
    })
    const job2 = await queue.publishArticle({
      draftId: draft.id,
    })
    await Promise.all([job1.finished(), job2.finished()])
    // only one article is created
    const count = (await knex('article').count().first())!.count
    expect(+count - +countBefore).toBe(1)
  })
})

const createPendingDraft = async (atomService: AtomService) => {
  const content = Math.random().toString()
  const contentHTML = `<p>${content} <strong>abc</strong></p>`
  const connections = ['1', '2', '3']

  return {
    draft: await atomService.create({
      table: 'draft',
      data: {
        authorId: '1',
        title: 'test title',
        summary: 'test summary',
        content: contentHTML,
        publishState: PUBLISH_STATE.pending,
        collection: connections,
      },
    }),
  }
}
