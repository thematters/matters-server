import { v2 as TranslateAPI } from '@google-cloud/translate'

import { LANGUAGE } from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'

const { zh_hans, zh_hant } = LANGUAGE

class GCP {
  translateAPI: TranslateAPI.Translate

  constructor() {
    this.translateAPI = new TranslateAPI.Translate({
      projectId: environment.gcpProjectId,
      keyFilename: environment.translateCertPath,
    })
  }

  // map to internal language
  toInternalLanguage = (externalLang: string) => {
    const langMap: { [key: string]: string } = {
      'zh-CN': zh_hans,
      'zh-TW': zh_hant,
    }

    return langMap[externalLang] || zh_hant
  }

  fromInteralLanguage = (internalLang: string) => {
    const langMap: { [key: string]: string } = {
      [zh_hans]: 'zh-CN',
      [zh_hant]: 'zh-TW',
    }

    return langMap[internalLang] || 'zh-TW'
  }

  detectLanguage = async (content: string) => {
    try {
      const [{ language }] = await this.translateAPI.detect(content)

      return this.toInternalLanguage(language)
    } catch (err) {
      logger.error(err)
      return ''
    }
  }

  translate = async (content: string, target: string) => {
    try {
      const [translation] = await this.translateAPI.translate(
        content,
        this.fromInteralLanguage(target)
      )
      return translation
    } catch (err) {
      logger.error(err)
      return ''
    }
  }
}

export const gcp = new GCP()
