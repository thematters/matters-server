import type { Connections, Asset } from 'definitions'

import { v4 } from 'uuid'

import { NODE_TYPES } from 'common/enums'
import { SystemService } from 'connectors'

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

beforeAll(async () => {
  connections = await genConnections()
  systemService = new SystemService(connections)
}, 50000)

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
