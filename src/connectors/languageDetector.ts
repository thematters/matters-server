import { environment, isTest } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import { LANGUAGES } from '#definitions/index.js'
import axios, { type AxiosRequestConfig } from 'axios'

const logger = getLogger('language-detector')

export class LanguageDetector {
  private apiUrl: string

  public constructor() {
    this.apiUrl = environment.languageDetectionApiUrl
  }

  public detect = async (text: string): Promise<LANGUAGES | null> => {
    if (isTest) {
      return null
    }

    const config: AxiosRequestConfig = {
      method: 'post',
      url: this.apiUrl,
      data: { text },
    }

    try {
      const response = await axios(config)
      return response.data.language
    } catch (error) {
      logger.error(error)
      return null
    }
  }
}
