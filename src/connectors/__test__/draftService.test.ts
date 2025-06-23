import type { Connections } from '#definitions/index.js'

import { AtomService } from '../atomService.js'
import { DraftService } from '../draftService.js'
import { PUBLISH_STATE } from '#common/enums/index.js'

import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let atomService: AtomService
let draftService: DraftService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  draftService = new DraftService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('countByAuthor', async () => {
  const count = await draftService.countByAuthor('1')
  expect(count).toBeDefined()
})

test('findUnpublishedByAuthor', async () => {
  const drafts = await draftService.findUnpublishedByAuthor('1')
  expect(drafts[0]).toBeDefined()
})

test('findUnpublishedByPublishAt', async () => {
  // Create a test draft with publish_at set
  const now = new Date()
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60) // 1 hour in future
  const pastDate1 = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour in past
  const pastDate2 = new Date(now.getTime() - 1000 * 60 * 60 * 2) // 2 hours in past

  // Insert test drafts
  const draft = await atomService.create({
    table: 'draft',
    data: {
      authorId: '1',
      title: 'Test Draft 1',
      content: 'Test content 1',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: pastDate1,
    },
  })
  await atomService.create({
    table: 'draft',
    data: {
      authorId: '1',
      title: 'Test Draft 2',
      content: 'Test content 2',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: futureDate,
    },
  })
  await atomService.create({
    table: 'draft',
    data: {
      authorId: '1',
      title: 'Test Draft 2',
      content: 'Test content 2',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: pastDate2,
    },
  })

  // Test finding drafts that should be published now
  const drafts = await draftService.findUnpublishedByPublishAt({
    start: pastDate1,
    end: now,
  })
  expect(drafts.length).toBe(1)
  expect(drafts[0].id).toBe(draft.id)
  expect(drafts[0].publishAt.getTime()).toBeLessThanOrEqual(now.getTime())
})
