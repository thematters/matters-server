import { environment } from 'common/environment'
import { cfsvc } from 'connectors'

test('genUrl', () => {
  expect(environment.cloudflareAccountId).toBe(undefined)
  const path = 'path/to/file'
  expect(cfsvc.genUrl(path)).toBe(
    'https://imagedelivery.net/undefined/non-prod/path/to/file/public'
  )
})
