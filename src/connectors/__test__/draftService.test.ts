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
  // Create test dates
  const now = new Date()
  const earlierDate = new Date(now.getTime() - 1000 * 60 * 60 * 24) // 1 day ago
  const laterDate = new Date(now.getTime() + 1000 * 60 * 60 * 24) // 1 day from now
  const recentUpdate = new Date(now.getTime() - 1000 * 60 * 10) // 10 minutes ago
  const olderUpdate = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour ago

  // Clean up any existing test drafts for this author
  const authorId = '2'
  await connections.knex('draft').where({ authorId }).del()

  // Create test drafts with specific ordering scenarios
  const draft1 = await atomService.create({
    table: 'draft',
    data: {
      authorId,
      title: 'Draft with earliest publish_at',
      content: 'Content 1',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: earlierDate,
      updatedAt: olderUpdate,
    },
  })

  const draft2 = await atomService.create({
    table: 'draft',
    data: {
      authorId,
      title: 'Draft with later publish_at',
      content: 'Content 2',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: laterDate,
      updatedAt: recentUpdate,
    },
  })

  const draft3 = await atomService.create({
    table: 'draft',
    data: {
      authorId,
      title: 'Draft with same publish_at as draft4 but older update',
      content: 'Content 3',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: earlierDate,
      updatedAt: olderUpdate,
    },
  })

  const draft4 = await atomService.create({
    table: 'draft',
    data: {
      authorId,
      title: 'Draft with same publish_at as draft3 but newer update',
      content: 'Content 4',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: earlierDate,
      updatedAt: recentUpdate,
    },
  })

  const draft5 = await atomService.create({
    table: 'draft',
    data: {
      authorId,
      title: 'Draft with null publish_at and recent update',
      content: 'Content 5',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: null,
      updatedAt: recentUpdate,
    },
  })

  const draft6 = await atomService.create({
    table: 'draft',
    data: {
      authorId,
      title: 'Draft with null publish_at and older update',
      content: 'Content 6',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: null,
      updatedAt: olderUpdate,
    },
  })

  // Get drafts with new ordering
  const drafts = await draftService.findUnpublishedByAuthor(authorId)

  // Verify ordering: publish_at asc (nulls last), then updated_at desc
  expect(drafts.length).toBeGreaterThanOrEqual(6)

  // Drafts with publish_at should come first, ordered by publish_at asc
  // Then drafts with same publish_at should be ordered by updated_at desc
  // Then drafts with null publish_at should come last, ordered by updated_at desc

  // Find our test drafts in the results
  const testDrafts = drafts.filter((d) =>
    [draft1.id, draft2.id, draft3.id, draft4.id, draft5.id, draft6.id].includes(
      d.id
    )
  )
  expect(testDrafts.length).toBe(6)

  // drafts with earlierDate should come before drafts with laterDate
  const draft1Index = testDrafts.findIndex((d) => d.id === draft1.id)
  const draft2Index = testDrafts.findIndex((d) => d.id === draft2.id)
  const draft3Index = testDrafts.findIndex((d) => d.id === draft3.id)
  const draft4Index = testDrafts.findIndex((d) => d.id === draft4.id)
  const draft5Index = testDrafts.findIndex((d) => d.id === draft5.id)
  const draft6Index = testDrafts.findIndex((d) => d.id === draft6.id)

  // Drafts with earlierDate (1, 3, 4) should come before draft with laterDate (2)
  expect(Math.max(draft1Index, draft3Index, draft4Index)).toBeLessThan(
    draft2Index
  )

  // Among drafts with same publish_at (1, 3, 4), those with newer updated_at should come first
  // draft4 has newer updated_at than draft1 and draft3, so it should come first among them
  expect(draft4Index).toBeLessThan(Math.min(draft1Index, draft3Index))

  // Drafts with null publish_at (5, 6) should come after all others
  expect(Math.min(draft5Index, draft6Index)).toBeGreaterThan(
    Math.max(draft1Index, draft2Index, draft3Index, draft4Index)
  )

  // Among drafts with null publish_at, newer updated_at should come first
  expect(draft5Index).toBeLessThan(draft6Index) // draft5 has newer updated_at

  // Clean up test data
  await connections.knex('draft').where({ authorId }).del()
})

test('findUnpublishedByPublishAt', async () => {
  // Create a test draft with publish_at set
  const now = new Date()
  const futureDate = new Date(now.getTime() + 1000 * 60 * 60) // 1 hour in future
  const pastDate1 = new Date(now.getTime() - 1000 * 60 * 60) // 1 hour in past
  const pastDate2 = new Date(now.getTime() - 1000 * 60 * 60 * 2) // 2 hours in past

  // Insert test drafts
  const authorId = '2'
  const draft = await atomService.create({
    table: 'draft',
    data: {
      authorId,
      title: 'Test Draft 1',
      content: 'Test content 1',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: pastDate1,
    },
  })
  await atomService.create({
    table: 'draft',
    data: {
      authorId,
      title: 'Test Draft 2',
      content: 'Test content 2',
      publishState: PUBLISH_STATE.unpublished,
      publishAt: futureDate,
    },
  })
  await atomService.create({
    table: 'draft',
    data: {
      authorId,
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
