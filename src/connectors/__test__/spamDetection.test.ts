import {
  createSpamDetectorConfig,
  normalizeSpamDetectionResponse,
  SpamDetector,
} from '../spamDetector.js'
import { environment } from '#common/environment.js'

describe('spam detector response handling', () => {
  test('normalizes score and detector metadata', () => {
    expect(
      normalizeSpamDetectionResponse({
        score: 0.88,
        decision: 'block',
        reason: 'commercial solicitation',
        p_spam: 0.7,
        p_ham: 0.02,
      })
    ).toEqual({
      score: 0.88,
      decision: 'block',
      reason: 'commercial solicitation',
      pSpam: 0.7,
      pHam: 0.02,
    })
  })

  test('normalizes lambda proxy body responses', () => {
    expect(
      normalizeSpamDetectionResponse({
        body: JSON.stringify({ score: 0.12, decision: 'review' }),
      })
    ).toEqual({
      score: 0.12,
      decision: 'review',
      reason: null,
      pSpam: null,
      pHam: null,
    })
  })

  test('builds raw and json request payloads', () => {
    const rawConfig = createSpamDetectorConfig({
      apiUrl: 'https://example.test',
      text: 'test text',
      requestFormat: 'raw',
    })
    expect(rawConfig.data).toBe('test text')
    expect(rawConfig.headers).toEqual({ 'Content-Type': 'text/plain' })

    expect(
      createSpamDetectorConfig({
        apiUrl: 'https://example.test',
        text: 'test text',
        requestFormat: 'json',
      }).data
    ).toEqual({ text: 'test text' })
  })
})

test.skip('detect', async () => {
  const spamDetection = new SpamDetector(environment.spamDetectionApiUrl)
  expect(await spamDetection.detect('test text')).toBeGreaterThanOrEqual(0)
}, 100000)
