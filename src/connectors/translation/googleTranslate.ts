import { TranslationServiceClient } from '@google-cloud/translate'
import { Translator } from './manager'

export class GoogleTranslate implements Translator {
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
    const [response] = await this.#client.translateText({
      parent: `projects/${this.#projectId}/locations/${this.#location}`,
      contents: [content],
      mimeType: 'text/plain',
      targetLanguageCode: targetLanguage,
    })

    for (const translation of response.translations ?? []) {
      return translation.translatedText ?? null
    }

    return null
  }
}
