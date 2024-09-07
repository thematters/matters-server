import { HtmlTranslator, Translator } from './manager'

export class NullTranslator implements Translator, HtmlTranslator {
  async detect(): Promise<string | null> {
    return 'en'
  }

  async translate(
    content: string,
    targetLanguage: string
  ): Promise<string | null> {
    return `[${targetLanguage}] ${content}`
  }

  async translateHtml(
    content: string,
    targetLanguage: string
  ): Promise<string | null> {
    return `[${targetLanguage}] ${content}`
  }
}
