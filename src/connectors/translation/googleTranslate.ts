import { TranslationServiceClient, protos } from '@google-cloud/translate'
import { HtmlTranslator, Translator } from './manager'
import { ManageInternalLanguage } from './matters'
import { Bcp47, Cldr } from './languageTagFramework'
import { LANGUAGE } from 'common/enums'

type TranslateTextRequest =
  protos.google.cloud.translation.v3.ITranslateTextRequest

export class GoogleTranslate
  implements Translator, HtmlTranslator, ManageInternalLanguage
{
  #client: TranslationServiceClient
  #projectId: string
  #location: string

  constructor(
    client: TranslationServiceClient,
    projectId: string,
    location = 'global'
  ) {
    this.#client = client
    this.#projectId = projectId
    this.#location = location
  }

  async detect(content: string): Promise<string | null> {
    const [response] = await this.#client.detectLanguage({
      parent: `projects/${this.#projectId}/locations/${this.#location}`,
      content,
    })

    for (const language of response.languages ?? []) {
      return language.languageCode ?? null
    }

    return null
  }

  async translate(
    content: string,
    targetLanguage: string
  ): Promise<string | null> {
    return this.#translateText({
      contents: [content],
      mimeType: 'text/plain',
      targetLanguageCode: targetLanguage,
    })
  }

  async translateHtml(
    content: string,
    targetLanguage: string
  ): Promise<string | null> {
    return this.#translateText({
      contents: [content],
      mimeType: 'text/html',
      targetLanguageCode: targetLanguage,
    })
  }

  async #translateText(
    request: Partial<TranslateTextRequest>
  ): Promise<string | null> {
    const [response] = await this.#client.translateText({
      parent: `projects/${this.#projectId}/locations/${this.#location}`,
      ...request,
    })

    for (const translation of response.translations ?? []) {
      return translation.translatedText ?? null
    }

    return null
  }

  /**
   * Convert the Matters language code to the one supported by the translator.
   *
   * @see https://cloud.google.com/translate/docs/languages
   */
  toTargetLanguage(language: string): string {
    const tags = new Cldr(language)

    switch (true) {
      case tags.script() === 'Hans':
      case tags.region() === 'CN':
        return 'zh-CN'
      case tags.script() === 'Hant':
      case tags.region() === 'TW':
        return 'zh-TW'
      default:
        return tags.language()
    }
  }

  /**
   * Convert the translator language code to the Matters language code.
   */
  toInternalLanguage(language: string): string {
    const tags = new Bcp47(language)

    switch (true) {
      case tags.script() === 'Hans':
      case tags.region() === 'CN':
        return LANGUAGE.zh_hans
      case tags.script() === 'Hant':
      case tags.region() === 'TW':
        return LANGUAGE.zh_hant
      default:
        return language
    }
  }
}
