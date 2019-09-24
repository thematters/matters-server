import { v4 } from 'uuid'
import { systemService } from '../systemService'

const assetValidation = {
  id: expect.any(String),
  uuid: expect.any(String),
  authorId: expect.any(String),
  type: expect.any(String),
  path: expect.any(String),
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date)
}

test('findAssetUrl', async () => {
  const url = await systemService.findAssetUrl('1')
  expect(url).toEqual(expect.any(String))
})

test('create and delete asset', async () => {
  const data = {
    uuid: v4(),
    authorId: 1,
    type: 'cover',
    path: 'path/to/file.txt'
  }
  const asset = await systemService.baseCreate(data, 'asset')
  expect(asset).toEqual(expect.objectContaining(assetValidation))

  await systemService.baseDelete(asset.id, 'asset')
  const result = await systemService.baseFindById(asset.id, 'asset')
  expect(result).toBeNull()
})
