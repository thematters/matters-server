import { SpamDetection } from 'connectors'

test.skip('detect', async () => {
  const spamDetection = new SpamDetection()
  expect(await spamDetection.detect('test text')).toBeGreaterThanOrEqual(0)
}, 100000)
