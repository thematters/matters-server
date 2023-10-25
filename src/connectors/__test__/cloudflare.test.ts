import { environment } from 'common/environment'
import { cfsvc } from 'connectors'

const ACCOUNT_HASH = 'kDRCwexxxx-pYA'

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
