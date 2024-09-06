import { TranslatorNotFoundError } from './errors'

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

export class Manager implements TranslationManager
{
  static #instance: Manager

  #drivers: {
    [key: string]: Translator
  } = {}

  static getInstance(): Manager {
    if (!Manager.#instance) {
      Manager.#instance = new Manager()
    }

    return Manager.#instance
  }

  addTranslator(name: string, translator: Translator) {
    this.#drivers[name] = translator
    return this
  }

  translator(name?: string): Translator {
    return typeof name === 'string'
      ? this.#getTranslator(name)
      : this.#getDefaultTranslator()
  }

  htmlTranslator(name?: string): Translator & HtmlTranslator {
    const translator = this.translator(name)

    if (! ('translateHtml' in translator)) {
      throw new Error('The translator does not support HTML translation.')
    }

    return translator as Translator & HtmlTranslator
  }

  #getDefaultTranslator(): Translator {
    const drivers = Object.keys(this.#drivers)

    if (drivers.length === 0) {
      throw new TranslatorNotFoundError('Could not find a translation driver.')
    }

    return this.#drivers[drivers[0]]
  }

  #getTranslator(name: string): Translator {
    const driver = this.#drivers[name]
    if (!driver) {
      throw new TranslatorNotFoundError(
        `Could not find "${name}" translator.`
      )
    }
    return driver
  }
}
