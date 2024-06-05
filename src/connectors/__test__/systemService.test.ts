import type { Connections, Asset } from 'definitions'

import { v4 } from 'uuid'

import { NODE_TYPES, COMMENT_TYPE, COMMENT_STATE } from 'common/enums'
import { SystemService, AtomService, JournalService } from 'connectors'

import { genConnections, closeConnections } from './utils'

const assetValidation = {
  id: expect.any(String),
  uuid: expect.any(String),
  authorId: expect.any(String),
  type: expect.any(String),
  path: expect.any(String),
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date),
}

let connections: Connections
let systemService: SystemService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  systemService = new SystemService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('findAssetUrl', async () => {
  // image assets return cloudflare url
  const imageUrl = await systemService.findAssetUrl('1')
  expect(imageUrl).toContain('https://imagedelivery.net')

  // not-image assets return s3 url
  const notImageUrl = await systemService.findAssetUrl('7')
  // @ts-ignore
  expect(notImageUrl).toContain(systemService.aws.s3Endpoint)
})

test('create and delete asset', async () => {
  const data = {
    uuid: v4(),
    authorId: '1',
    type: 'cover',
    path: 'path/to/file.txt',
  }
  const asset = await systemService.baseCreate<Asset>(data, 'asset')
  expect(asset).toEqual(expect.objectContaining(assetValidation))

  await systemService.baseDelete(asset.id, 'asset')
  const result = await systemService.baseFindById(asset.id, 'asset')
  expect(result).toBeUndefined()
})

test('copy asset map', async () => {
  const data = {
    uuid: v4(),
    authorId: '1',
    type: 'cover',
    path: 'path/to/file.txt',
  }
  const draftEntityTypeId = '13'
  const articleEntityTypeId = '4'
  await systemService.createAssetAndAssetMap(data, draftEntityTypeId, '1')
  const source = {
    entityTypeId: draftEntityTypeId,
    entityId: '1',
  }
  const target = {
    entityTypeId: articleEntityTypeId,
    entityId: '1',
  }
  // should not throw errors
  await systemService.copyAssetMapEntities({ source, target })
})

describe('report', () => {
  test('submit report', async () => {
    const report = await systemService.submitReport({
      targetType: NODE_TYPES.Article,
      targetId: '1',
      reporterId: '1',
      reason: 'other',
    })
    expect(report.id).toBeDefined()
    expect(report.articleId).not.toBeNull()
    expect(report.commentId).toBeNull()
  })
  test('submit report on journals', async () => {
    const journalService = new JournalService(connections)
    const journal = await journalService.create(
      { content: 'test', assetIds: [] },
      { id: '1', state: 'active' }
    )
    const report = await systemService.submitReport({
      targetType: NODE_TYPES.Journal,
      targetId: journal.id,
      reporterId: '1',
      reason: 'other',
    })
    expect(report.id).toBeDefined()
    expect(report.journalId).not.toBeNull()
    expect(report.commentId).toBeNull()
    expect(report.articleId).toBeNull()
  })
  test('collapse comment if more than 3 different users report it', async () => {
    const commentId = '1'
    const comment = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })
    expect(comment.type).toBe(COMMENT_TYPE.article)
    expect(comment.state).toBe(COMMENT_STATE.active)

    // only 2 reports, comment should not be collapsed

    await systemService.submitReport({
      targetType: NODE_TYPES.Comment,
      targetId: commentId,
      reporterId: '2',
      reason: 'other',
    })
    await systemService.submitReport({
      targetType: NODE_TYPES.Comment,
      targetId: commentId,
      reporterId: '3',
      reason: 'other',
    })

    const commentAfter2Reports = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })
    expect(commentAfter2Reports.state).toBe(COMMENT_STATE.active)

    // only 3 reports from 2 different users, comment should not be collapsed

    await systemService.submitReport({
      targetType: NODE_TYPES.Comment,
      targetId: commentId,
      reporterId: '3',
      reason: 'other',
    })

    const commentAfter3Reports = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })
    expect(commentAfter3Reports.state).toBe(COMMENT_STATE.active)

    // 4 reports from 3 different users, comment should be collapsed

    await systemService.submitReport({
      targetType: NODE_TYPES.Comment,
      targetId: commentId,
      reporterId: '4',
      reason: 'other',
    })

    const commentAfter4Reports = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })
    expect(commentAfter4Reports.state).toBe(COMMENT_STATE.collapsed)
  })

  test('collapse comment if article author report it', async () => {
    const commentId = '2'
    const comment = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })
    expect(comment.type).toBe(COMMENT_TYPE.article)
    expect(comment.state).toBe(COMMENT_STATE.active)

    const { authorId } = await atomService.findUnique({
      table: 'article',
      where: { id: comment.targetId },
    })

    await systemService.submitReport({
      targetType: NODE_TYPES.Comment,
      targetId: commentId,
      reporterId: authorId,
      reason: 'other',
    })

    const commentAfterReport = await atomService.findUnique({
      table: 'comment',
      where: { id: commentId },
    })

    expect(commentAfterReport.state).toBe(COMMENT_STATE.collapsed)
  })
})
