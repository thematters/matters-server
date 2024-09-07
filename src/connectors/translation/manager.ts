import { TranslationServiceClient } from '@google-cloud/translate'
import { ClientOptions } from 'google-gax'

import { TranslatorNotFoundError, UnsupportedTranslatorError } from './errors'
import { GoogleTranslate } from './googleTranslate'
import { NullTranslator } from './nullTranslator'

export interface Translator {
  detect(content: string): Promise<string | null>
  translate(content: string, targetLanguage: string): Promise<string | null>
}

export interface HtmlTranslator {
  translateHtml(content: string, targetLanguage: string): Promise<string | null>
}

export interface TranslationManager {
  addTranslator(name: string, translator: Translator): TranslationManager
  translator(name?: string): Translator
}

export type TranslationGoogleConfig = {
  driver: 'google'
} & ClientOptions

export type TranslationNullConfig = {
  driver: 'null'
}

export type TranslationConfig = {
  default: string
  drivers: {
    [key: string]: TranslationGoogleConfig | TranslationNullConfig
  }
}

export class Manager implements TranslationManager {
  static #instance: Manager

  #config: TranslationConfig

  #resolved: {
    [key: string]: Translator
  } = {}

  constructor(config: TranslationConfig) {
    this.#config = config
  }

  static getInstance(): Manager {
    if (!Manager.#instance) {
      throw new Error('Missing global translation manager.')
    }

    return Manager.#instance
  }

  asGlobal() {
    Manager.#instance = this
    return this
  }

  addTranslator(name: string, translator: Translator) {
    this.#resolved[name] = translator
    return this
  }

  translator(name?: string): Translator {
    return typeof name === 'string'
      ? this.#getTranslator(name)
      : this.#getDefaultTranslator()
  }

  htmlTranslator(name?: string): Translator & HtmlTranslator {
    const translator = this.translator(name)

    if (!('translateHtml' in translator)) {
      throw new UnsupportedTranslatorError(
        'The translator does not support HTML translation.'
      )
    }

    return translator as Translator & HtmlTranslator
  }

  #getDefaultTranslator(): Translator {
    const defaultDriver = this.#config.default

    return this.#getTranslator(defaultDriver)
  }

  #getTranslator(name: string): Translator {
    const driver = this.#resolved[name]

    if (!driver) {
      return this.#makeTranslator(name)
    }

    return driver
  }

  #makeTranslator(name: string): Translator {
    const config = this.#config.drivers[name]

    if (!config) {
      throw new TranslatorNotFoundError(`Could not find "${name}" translator.`)
    }

    switch (config.driver) {
      case 'google':
        return this.#makeGoogleTranslator(config)
      case 'null':
        return this.#makeNullTranslator()
      default:
        throw new Error('Unsupported translation driver.')
    }
  }

  #makeGoogleTranslator(config: TranslationGoogleConfig) {
    const projectId = config.projectId

    if (typeof projectId !== 'string') {
      throw new Error('Missing project ID.')
    }

    const client = new TranslationServiceClient(config)

    return new GoogleTranslate(client, projectId)
  }

  #makeNullTranslator() {
    return new NullTranslator()
  }
}
