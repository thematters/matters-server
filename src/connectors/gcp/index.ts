import { v2 as TranslateAPI } from '@google-cloud/translate'
import axios from 'axios'

import { LANGUAGE } from 'common/enums'
import { environment, isTest } from 'common/environment'
import { ActionFailedError, UserInputError } from 'common/errors'
import logger from 'common/logger'

const { zh_hans, zh_hant, en } = LANGUAGE

class GCP {
  translateAPI: TranslateAPI.Translate

  constructor() {
    try {
      this.translateAPI = new TranslateAPI.Translate({
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
      const [{ language }] = await this.translateAPI.detect(content)
      return this.toInternalLanguage(language)
    } catch (err) {
      logger.error(err)
      return
    }
  }

  translate = async ({
    content,
    target,
  }: {
    content: string
    target: string
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

  recaptcha = async ({ token, ip }: { token?: string; ip?: string }) => {
    // skip test
    if (isTest) {
      return true
    }

    if (!token) {
      throw new UserInputError('operation is only allowed on matters.news')
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
      throw new ActionFailedError(`please try again: ${data['error-codes']}`)
    }

    // fail for less than 0.5
    if (score < 0.5) {
      console.log("very likely bot traffic:", data)
    }

    // pass
    return score > 0.0
  }
}

export const gcp = new GCP()
