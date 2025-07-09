import { SpamDetector } from '../spamDetector.js'

test.skip('detect', async () => {
  const spamDetection = new SpamDetector()
  expect(await spamDetection.detect('test text')).toBeGreaterThanOrEqual(0)
}, 100000)
