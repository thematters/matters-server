import { TranslationServiceClient, protos } from '@google-cloud/translate'
import { HtmlTranslator, Translator } from './manager'

type TranslateTextRequest =
  protos.google.cloud.translation.v3.ITranslateTextRequest

export class GoogleTranslate implements Translator, HtmlTranslator {
  #client: TranslationServiceClient
  #projectId: string
  #location: string

  constructor(client: TranslationServiceClient, projectId: string, location = 'global') {
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

  async translate(content: string, targetLanguage: string): Promise<string | null> {
    return this.#translateText({
      contents: [content],
      mimeType: 'text/plain',
      targetLanguageCode: targetLanguage,
    })
  }

  async translateHtml(content: string, targetLanguage: string): Promise<string | null> {
    return this.#translateText({
      contents: [content],
      mimeType: 'text/html',
      targetLanguageCode: targetLanguage,
    })
  }

  async #translateText(request: Partial<TranslateTextRequest>): Promise<string | null> {
    const [response] = await this.#client.translateText({
      parent: `projects/${this.#projectId}/locations/${this.#location}`,
      ...request,
    })

    for (const translation of response.translations ?? []) {
      return translation.translatedText ?? null
    }

    return null
  }
}
