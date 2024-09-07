import { HtmlTranslator, Translator } from './manager'

export class NullTranslator implements Translator, HtmlTranslator {
  async detect(): Promise<string | null> {
    return 'en'
  }

  async translate(content: string): Promise<string | null> {
    return content
  }

  async translateHtml(content: string): Promise<string | null> {
    return content
  }
}
