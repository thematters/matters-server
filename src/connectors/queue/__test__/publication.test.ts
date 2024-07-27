import type { Connections } from 'definitions'
import type { Knex } from 'knex'

import { ARTICLE_STATE, PUBLISH_STATE, CAMPAIGN_STATE } from 'common/enums'
import { AtomService, CampaignService } from 'connectors'
import { PublicationQueue } from 'connectors/queue'

import { genConnections, closeConnections } from '../../__test__/utils'

let connections: Connections
let atomService: AtomService
let campaignService: CampaignService
let queue: PublicationQueue
let knex: Knex
beforeAll(async () => {
  connections = await genConnections()
  knex = connections.knex
  atomService = new AtomService(connections)
  campaignService = new CampaignService(connections)
  queue = new PublicationQueue(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('publicationQueue.publishArticle', () => {
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
    const { draft } = await createPendingDraft()
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

    // article is connected to campaigns
    const campaign_article = await atomService.findFirst({
      table: 'campaign_article',
      where: { articleId: updatedArticle.id },
    })
    expect(campaign_article).toBeDefined()
  })

  test('publish pending draft concurrently', async () => {
    const countBefore = (await knex('article').count().first())!.count
    const { draft } = await createPendingDraft()
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

const createPendingDraft = async () => {
  const content = Math.random().toString()
  const contentHTML = `<p>${content} <strong>abc</strong></p>`
  const connections = ['1', '2', '3']
  const authorId = '1'

  const campaign = await campaignService.createWritingChallenge({
    name: 'test',
    description: 'test',
    link: 'https://test.com',
    applicationPeriod: [
      new Date('2010-01-01 11:30'),
      new Date('2010-01-01 15:00'),
    ] as const,
    writingPeriod: [
      new Date('2010-01-02 11:30'),
      new Date('2010-01-02 15:00'),
    ] as const,
    creatorId: '2',
    state: CAMPAIGN_STATE.active,
  })
  const stages = await campaignService.updateStages(campaign.id, [
    { name: 'stage1' },
  ])
  const user = await atomService.userIdLoader.load('1')
  const application = await campaignService.apply(campaign, user)
  await campaignService.approve(application.id)

  return {
    draft: await atomService.create({
      table: 'draft',
      data: {
        authorId,
        title: 'test title',
        summary: 'test summary',
        content: contentHTML,
        publishState: PUBLISH_STATE.pending,
        collection: connections,
        campaigns: JSON.stringify([
          { campaign: campaign.id, stage: stages[0].id },
        ]),
      },
    }),
  }
}
