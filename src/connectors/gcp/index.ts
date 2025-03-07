import { v2 as TranslateAPI } from '@google-cloud/translate'

import { LANGUAGE } from 'common/enums'
import { environment } from 'common/environment'
import { getLogger } from 'common/logger'

const logger = getLogger('service-gcp')

const { zh_hans, zh_hant, en } = LANGUAGE

export class GCP {
  private translateAPI: TranslateAPI.Translate

  public constructor() {
    this.translateAPI = new TranslateAPI.Translate({
      key: environment.translateKey,
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
      const [{ language }] = await this.translateAPI.detect(content)
      return this.toInternalLanguage(language)
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
      const [translation] = await this.translateAPI.translate(
        content,
        this.fromInteralLanguage(target)
      )
      return translation
    } catch (err) {
      logger.error(err)
      return
    }
  }
}

export const gcp = new GCP()
