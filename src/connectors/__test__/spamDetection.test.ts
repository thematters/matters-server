import { SpamDetector } from 'connectors'

test.skip('detect', async () => {
  const spamDetection = new SpamDetector()
  expect(await spamDetection.detect('test text')).toBeGreaterThanOrEqual(0)
}, 100000)
