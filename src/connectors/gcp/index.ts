import { v3 as TranslateAPI } from '@google-cloud/translate'
import axios from 'axios'

import { LANGUAGE } from 'common/enums'
import { environment, isTest } from 'common/environment'
import { ActionFailedError, UserInputError } from 'common/errors'
import { getLogger } from 'common/logger'

const logger = getLogger('service-gcp')

const { zh_hans, zh_hant, en } = LANGUAGE

class GCP {
  translateAPI: TranslateAPI.TranslationServiceClient

  constructor() {
    try {
      this.translateAPI = new TranslateAPI.TranslationServiceClient({
        projectId: environment.gcpProjectId,
        keyFilename: environment.translateCertPath,
      })
    } catch (err) {
      logger.error(err)
    }
  }

  // map to internal language
  toInternalLanguage = (externalLang: string) => {
    const langMap: { [key: string]: string } = {
      'zh-CN': zh_hans,
      'zh-TW': zh_hant,
      en,
    }

    return langMap[externalLang] || externalLang
  }

  fromInteralLanguage = (internalLang: string) => {
    const langMap: { [key: string]: string } = {
      [zh_hans]: 'zh-CN',
      [zh_hant]: 'zh-TW',
      [en]: 'en',
    }

    return langMap[internalLang] || 'zh-TW'
  }

  detectLanguage = async (content: string) => {
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

  translate = async ({
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

  recaptcha = async ({ token, ip }: { token?: string; ip?: string }) => {
    // skip test
    if (isTest) {
      return true
    }

    if (!token) {
      throw new UserInputError(
        'operation is only allowed on matters.{town,news}'
      )
    }

    // Turing test with recaptcha
    const { data } = await axios({
      method: 'post',
      url: 'https://www.google.com/recaptcha/api/siteverify',
      params: {
        secret: environment.recaptchaSecret,
        response: token,
        remoteip: ip,
      },
    })

    const { success, score } = data

    if (!success) {
      logger.warn('gcp recaptcha no success: %j', data)
      throw new ActionFailedError(`please try again: ${data['error-codes']}`)
    }

    // fail for less than 0.5
    if (score < 0.5) {
      logger.info('very likely bot traffic: %j', data)
    }

    // pass
    return score > 0.0
  }
}

export const gcp = new GCP()
