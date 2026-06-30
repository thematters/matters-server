import { isTest } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import * as Sentry from '@sentry/node'
import axios, { type AxiosRequestConfig } from 'axios'

const logger = getLogger('spam-detector')

export type SpamDetectorRequestFormat = 'json' | 'raw'

export interface SpamDetectionResult {
  score: number
  decision?: string | null
  reason?: string | null
  pSpam?: number | null
  pHam?: number | null
}

const toNullableString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : null

const toNullableNumber = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const parsePayload = (data: unknown): Record<string, unknown> | null => {
  if (typeof data === 'string') {
    try {
      return parsePayload(JSON.parse(data))
    } catch {
      return null
    }
  }

  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>
    if ('body' in payload) {
      return parsePayload(payload.body)
    }
    return payload
  }

  return null
}

export const normalizeSpamDetectionResponse = (
  data: unknown
): SpamDetectionResult | null => {
  const payload = parsePayload(data)
  if (!payload) {
    return null
  }

  const score = Number(payload.score)
  if (!Number.isFinite(score)) {
    return null
  }

  return {
    score,
    decision: toNullableString(payload.decision),
    reason: toNullableString(payload.reason),
    pSpam: toNullableNumber(payload.p_spam ?? payload.pSpam),
    pHam: toNullableNumber(payload.p_ham ?? payload.pHam),
  }
}

export const createSpamDetectorConfig = ({
  apiUrl,
  text,
  requestFormat,
}: {
  apiUrl: string
  text: string
  requestFormat: SpamDetectorRequestFormat
}): AxiosRequestConfig => ({
  method: 'post',
  url: apiUrl,
  data: requestFormat === 'raw' ? text : { text },
  headers: requestFormat === 'raw' ? { 'Content-Type': 'text/plain' } : {},
})

export class SpamDetector {
  private apiUrl: string
  private requestFormat: SpamDetectorRequestFormat

  public constructor(
    apiUrl: string,
    {
      requestFormat = 'json',
    }: { requestFormat?: SpamDetectorRequestFormat } = {}
  ) {
    this.apiUrl = apiUrl
    this.requestFormat = requestFormat
  }

  public detect = async (text: string): Promise<number | null> => {
    const result = await this.detectResult(text)
    return result?.score ?? null
  }

  public detectResult = async (
    text: string
  ): Promise<SpamDetectionResult | null> => {
    if (isTest) {
      return null
    }

    const config = createSpamDetectorConfig({
      apiUrl: this.apiUrl,
      text,
      requestFormat: this.requestFormat,
    })

    let retries = 0
    while (retries < 3) {
      try {
        const response = await axios(config)
        return normalizeSpamDetectionResponse(response.data)
      } catch (error) {
        retries++
        if (retries >= 3) {
          logger.error(error)
          Sentry.captureException(error)
        } else {
          logger.warn(error)
          await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
        }
      }
    }
    return null
  }
}
