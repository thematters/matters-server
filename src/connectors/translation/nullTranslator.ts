import { Translator } from './manager'

export class NullTranslator implements Translator {
  async detect(): Promise<string | null> {
    return 'en'
  }

  async translate(content: string): Promise<string | null> {
    return content
  }
}
