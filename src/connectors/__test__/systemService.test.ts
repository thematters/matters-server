import type { Connections } from 'definitions'

import { v4 } from 'uuid'

import { SystemService } from 'connectors'

import { genConnections } from './utils'

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
})

test('findAssetUrl', async () => {
  // image assets return cloudflare url
  const imageUrl = await systemService.findAssetUrl('1')
  expect(imageUrl).toContain('https://imagedelivery.net')

  // not-image assets return s3 url
  const notImageUrl = await systemService.findAssetUrl('7')
  expect(notImageUrl).toContain(systemService.aws.s3Endpoint)
})

test('create and delete asset', async () => {
  const data = {
    uuid: v4(),
    authorId: 1,
    type: 'cover',
    path: 'path/to/file.txt',
  }
  const asset = await systemService.baseCreate(data, 'asset')
  expect(asset).toEqual(expect.objectContaining(assetValidation))

  await systemService.baseDelete(asset.id, 'asset')
  const result = await systemService.baseFindById(asset.id, 'asset')
  expect(result).toBeUndefined()
})
