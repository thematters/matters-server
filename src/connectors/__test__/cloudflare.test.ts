import { jest } from '@jest/globals'

import { environment } from '#common/environment.js'
import { ServerError } from '#common/errors.js'
import { Readable } from 'stream'
import { cfsvc } from '../cloudflare/index.js'

const ACCOUNT_HASH = 'kDRCwexxxx-pYA'

const mockFetchResponse = (
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {}
) => {
  const fetchMock = jest.fn(async () => ({
    ok,
    status,
    json: async () => body,
  }))
  // @ts-expect-error minimal fetch stub for tests
  global.fetch = fetchMock
  return fetchMock
}

const upload = {
  createReadStream: () => Readable.from(['fake-image-bytes']),
  mimetype: 'image/jpeg',
  filename: 'test.jpg',
}

afterEach(() => {
  // @ts-expect-error cleanup fetch stub
  delete global.fetch
})

test('genUrl', () => {
  expect(environment.cloudflareAccountId).toBe(undefined)
  expect(environment.cloudflareAccountHash).toBe(ACCOUNT_HASH)
  const path = 'path/to/file.jpeg'
  expect(cfsvc.genUrl(path)).toBe(
    'https://imagedelivery.net/kDRCwexxxx-pYA/non-prod/path/to/file.jpeg/public'
  )
})

test('uploadByUrl', async () => {
  // environment.ocloudflareAccountHash = 'kDRCwexxxx-pYA'
  expect(
    await cfsvc.baseUploadFileByUrl(
      'cover',
      'https://imagedelivery.net/kDRCwexxxx-pYA/non-prod/cover/uuid-or-path-to-image.jpeg/public',
      'uuid'
    )
  ).toBe('cover/uuid-or-path-to-image.jpeg')
})

test('baseUploadFileByUrl returns key on success', async () => {
  mockFetchResponse({ success: true, result: {} })
  // NOTE: the double dot reflects long-standing genKey + path.extname behavior
  expect(
    await cfsvc.baseUploadFileByUrl(
      'cover',
      'https://example.com/some-image.jpeg',
      'uuid'
    )
  ).toBe('cover/uuid..jpeg')
})

test('baseUploadFileByUrl throws on success:false', async () => {
  mockFetchResponse(
    { success: false, errors: [{ code: 5455, message: 'quota exceeded' }] },
    { ok: false, status: 409 }
  )
  await expect(
    cfsvc.baseUploadFileByUrl(
      'cover',
      'https://example.com/some-image.jpeg',
      'uuid'
    )
  ).rejects.toBeInstanceOf(ServerError)
})

test('baseUploadFile returns key on success', async () => {
  mockFetchResponse({ success: true, result: {} })
  expect(await cfsvc.baseUploadFile('moment', upload, 'uuid')).toBe(
    'moment/uuid.jpeg'
  )
})

test('baseUploadFile throws on success:false', async () => {
  mockFetchResponse(
    { success: false, errors: [{ code: 10000, message: 'auth error' }] },
    { ok: false, status: 403 }
  )
  await expect(
    cfsvc.baseUploadFile('moment', upload, 'uuid')
  ).rejects.toBeInstanceOf(ServerError)
})

test('directUploadImage returns key, id and uploadURL on success', async () => {
  mockFetchResponse({
    success: true,
    result: {
      id: 'non-prod/moment/uuid.jpeg',
      uploadURL: 'https://upload.imagedelivery.net/hash/non-prod-id',
    },
  })
  expect(await cfsvc.directUploadImage('moment', 'uuid', 'jpeg')).toEqual({
    key: 'moment/uuid.jpeg',
    id: 'non-prod/moment/uuid.jpeg',
    uploadURL: 'https://upload.imagedelivery.net/hash/non-prod-id',
  })
})

test('directUploadImage throws on success:false instead of returning undefined', async () => {
  // shape observed during the 2026-07 Cloudflare direct upload outage
  mockFetchResponse(
    {
      result: null,
      success: false,
      errors: [{ message: 'Internal Server Error', code: 5550 }],
    },
    { ok: false, status: 415 }
  )
  await expect(
    cfsvc.directUploadImage('moment', 'uuid', 'jpeg')
  ).rejects.toBeInstanceOf(ServerError)
})

test('directUploadImage throws on incomplete result', async () => {
  mockFetchResponse({ success: true, result: { id: 'only-id' } })
  await expect(
    cfsvc.directUploadImage('moment', 'uuid', 'jpeg')
  ).rejects.toBeInstanceOf(ServerError)
})
