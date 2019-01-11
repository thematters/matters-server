import { v4 } from 'uuid'
import { SystemService } from '../systemService'

import { knex } from 'connectors/db'

afterAll(knex.destroy)

const assetValidation = {
  id: expect.any(String),
  uuid: expect.any(String),
  authorId: expect.any(String),
  type: expect.any(String),
  path: expect.any(String),
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date)
}

const service = new SystemService()

test('findAssetUrl', async () => {
  const url = await service.findAssetUrl('1')
  expect(url).toEqual(expect.any(String))
})

test('findAssetsByAuthorId', async () => {
  const assets = await service.findAssetsByAuthorId('1')
  expect(assets.length).toBe(3)
  expect(assets[0]).toEqual(expect.objectContaining(assetValidation))
})

test('findAssetsByAuthorIdAndType', async () => {
  const assets = await service.findAssetsByAuthorIdAndType('1', 'avatar')
  expect(assets.length).toBe(1)
  expect(assets[0]).toEqual(expect.objectContaining(assetValidation))
})

test('create and delete asset', async () => {
  const data = {
    uuid: v4(),
    authorId: 1,
    type: 'cover',
    path: 'path/to/file.txt'
  }
  const asset = await service.baseCreate(data, 'asset')
  expect(asset).toEqual(expect.objectContaining(assetValidation))

  await service.baseDelete(asset.id, 'asset')
  const result = await service.baseFindById(asset.id, 'asset')
  expect(result).toBeNull()
})
