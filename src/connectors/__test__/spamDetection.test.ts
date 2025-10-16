import { SpamDetector } from '../spamDetector.js'
import { environment } from '#common/environment.js'

test.skip('detect', async () => {
  const spamDetection = new SpamDetector(environment.spamDetectionApiUrl)
  expect(await spamDetection.detect('test text')).toBeGreaterThanOrEqual(0)
}, 100000)
