import { SpamDetection } from 'connectors'

test('detect', async () => {
  const spamDetection = new SpamDetection()
  expect(await spamDetection.detect('test text')).toBeGreaterThanOrEqual(0)
}, 100000)
