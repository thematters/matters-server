import axios, { type AxiosRequestConfig } from 'axios'

import { environment, isTest } from 'common/environment'
import { getLogger } from 'common/logger'

const logger = getLogger('spam-detector')

export class SpamDetector {
  private apiUrl: string

  public constructor() {
    this.apiUrl = environment.spamDetectionApiUrl
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

    try {
      const response = await axios(config)
      return response.data.score
    } catch (error) {
      logger.error(error)
      return null
    }
  }
}
