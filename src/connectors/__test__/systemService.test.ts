import { v4 } from 'uuid'

import { SystemService } from 'connectors'

const assetValidation = {
  id: expect.any(String),
  uuid: expect.any(String),
  authorId: expect.any(String),
  type: expect.any(String),
  path: expect.any(String),
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date),
}

const service = new SystemService()

test('findAssetUrl', async () => {
  // image assets return cloudflare url
  const imageUrl = await service.findAssetUrl('1')
  expect(imageUrl).toContain('https://imagedelivery.net')

  // not-image assets return s3 url
  const notImageUrl = await service.findAssetUrl('7')
  expect(notImageUrl).toContain(service.aws.s3Endpoint)
})

test('create and delete asset', async () => {
  const data = {
    uuid: v4(),
    authorId: 1,
    type: 'cover',
    path: 'path/to/file.txt',
  }
  const asset = await service.baseCreate(data, 'asset')
  expect(asset).toEqual(expect.objectContaining(assetValidation))

  await service.baseDelete(asset.id, 'asset')
  const result = await service.baseFindById(asset.id, 'asset')
  expect(result).toBeUndefined()
})
