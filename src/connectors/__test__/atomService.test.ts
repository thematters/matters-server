import { v4 } from 'uuid'

import { AtomService } from 'connectors'

const assetValidation = {
  id: expect.any(String),
  uuid: expect.any(String),
  authorId: expect.any(String),
  type: expect.any(String),
  path: expect.any(String),
  createdAt: expect.any(Date),
  updatedAt: expect.any(Date),
}

const service = new AtomService()

test('findAssetUrl', async () => {
  const asset = await service.findFirst({
    table: 'asset',
    where: { id: '1' },
  })
  expect(asset?.path).toEqual(expect.any(String))
})

test('create and delete asset', async () => {
  const data = {
    uuid: v4(),
    authorId: 1,
    type: 'cover',
    path: 'path/to/file.txt',
  }
  const asset = await service.create({ data, table: 'asset' })
  expect(asset).toEqual(expect.objectContaining(assetValidation))

  await service.deleteMany({ whereIn: ['id', [asset.id]], table: 'asset' })
  const result = await service.findFirst({
    where: { id: asset.id },
    table: 'asset',
  })
  expect(result).toBeUndefined()
})

test('updateMany assets', async () => {
  const data = {
    uuid: v4(),
    authorId: 1,
    type: 'cover',
    path: 'path/to/file.txt',
  }
  const asset = await service.create({ data, table: 'asset' })
  expect(asset).toEqual(expect.objectContaining(assetValidation))

  const updated = await service.updateMany({
    whereIn: ['id', [asset.id]],
    table: 'asset',
    data: { type: 'embed' },
  })
  expect(updated?.length).toBeGreaterThanOrEqual(1)

  const result = await service.findFirst({
    where: { id: asset.id },
    table: 'asset',
  })
  expect(result?.type).toBe('embed')
})
