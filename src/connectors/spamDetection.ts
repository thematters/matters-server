import axios, { type AxiosRequestConfig } from 'axios'

import { environment } from 'common/environment'
import { getLogger } from 'common/logger'

const logger = getLogger('spam-detection')

export class SpamDetection {
  private apiUrl: string

  public constructor() {
    this.apiUrl = environment.spamDetectionApiUrl
  }

  public detect = async (text: string): Promise<number | null> => {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: this.apiUrl,
      data: {
        text,
      },
    }

    try {
      const response = await axios(config)
      console.log(response.data)
      return response.data.score
    } catch (error) {
      logger.error(error)
      return null
    }
  }
}
