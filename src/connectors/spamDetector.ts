import { isTest } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import * as Sentry from '@sentry/node'
import axios, { type AxiosRequestConfig } from 'axios'

const logger = getLogger('spam-detector')

export class SpamDetector {
  private apiUrl: string

  public constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  public detect = async (text: string): Promise<number | null> => {
    if (isTest) {
      return null
    }

    const config: AxiosRequestConfig = {
      method: 'post',
      url: this.apiUrl,
      data: {
        text,
      },
    }

    let retries = 0
    while (retries < 3) {
      try {
        const response = await axios(config)
        return response.data.score
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
