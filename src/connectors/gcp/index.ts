import { v3 as TranslateAPI } from '@google-cloud/translate'

import { LANGUAGE } from 'common/enums'
import { environment } from 'common/environment'
import { getLogger } from 'common/logger'

const logger = getLogger('service-gcp')

const { zh_hans, zh_hant, en } = LANGUAGE

export class GCP {
  private translateAPI: TranslateAPI.TranslationServiceClient

  public constructor() {
    this.translateAPI = new TranslateAPI.TranslationServiceClient({
      projectId: environment.gcpProjectId,
      keyFilename: environment.translateCertPath,
    })
  }

  // map to internal language
  private toInternalLanguage = (externalLang: string) => {
    const langMap: { [key: string]: string } = {
      'zh-CN': zh_hans,
      'zh-TW': zh_hant,
      en,
    }

    return langMap[externalLang] || externalLang
  }

  private fromInteralLanguage = (internalLang: string) => {
    const langMap: { [key: string]: string } = {
      [zh_hans]: 'zh-CN',
      [zh_hant]: 'zh-TW',
      [en]: 'en',
    }

    return langMap[internalLang] || 'zh-TW'
  }

  public detectLanguage = async (content: string) => {
    try {
      const [response] = await this.translateAPI.detectLanguage({
        parent: `projects/${environment.gcpProjectId}/locations/global`,
        content,
      })

      if (!response.languages || !response.languages[0].languageCode) {
        return
      }

      const languageCode = response.languages[0].languageCode

      return this.toInternalLanguage(languageCode)
    } catch (err) {
      logger.error(err)
      return
    }
  }

  public translate = async ({
    content,
    target,
    mimeType = 'text/html',
  }: {
    content: string
    target: string
    mimeType?: 'text/plain' | 'text/html'
  }) => {
    try {
      const [response] = await this.translateAPI.translateText({
        parent: `projects/${environment.gcpProjectId}/locations/global`,
        contents: [content],
        mimeType,
        targetLanguageCode: this.fromInteralLanguage(target),
      })

      if (!response.translations) {
        return
      }

      for (const translation of response.translations) {
        return translation.translatedText
      }
    } catch (err) {
      logger.error(err)
      return
    }
  }
}

export const gcp = new GCP()
