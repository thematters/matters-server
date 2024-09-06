import { TranslatorNotFoundError, UnsupportedTranslatorError } from './errors'
import { HtmlTranslator, Manager, Translator } from './manager'
import { NullTranslator } from './nullTranslator'

it('should return the same instance for multiple calls to getInstance()', () => {
  const instance1 = Manager.getInstance()
  const instance2 = Manager.getInstance()
  expect(instance1).toBe(instance2)
})

it('can add a translator', () => {
  const manager = new Manager()
  const driver = new NullTranslator()
  manager.addTranslator('null', driver)
  expect(manager.translator('null')).toBe(driver)
})

it('overrides a translator with the same name', () => {
  const manager = new Manager()
  const translator1 = new NullTranslator()
  const translator2 = new NullTranslator()
  manager.addTranslator('null', translator1)
  manager.addTranslator('null', translator2)
  expect(manager.translator('null')).toBe(translator2)
})

it('throws error when could not find specific translator', () => {
  const manager = new Manager()
  expect(() => manager.translator('null')).toThrow(new TranslatorNotFoundError(
    'Could not find "null" translator.'
  ))
})

test('the first added translator is the default driver', () => {
  const manager = new Manager()
  const driver1 = new NullTranslator()
  const driver2 = new NullTranslator()
  manager.addTranslator('one', driver1)
  manager.addTranslator('two', driver2)
  expect(manager.translator()).toBe(driver1)
})

it('throws error if it get the default driver when there is none', () => {
  const manager = new Manager()
  expect(() => manager.translator()).toThrow(new TranslatorNotFoundError(
    'Could not find a translation driver.'
  ))
})

it('can retrieve html translator', () => {
  const translator = new class implements Translator, HtmlTranslator {
    async detect(content: string): Promise<string | null> {
      return content
    }
    async translate(content: string): Promise<string | null> {
      return content
    }
    async translateHtml(content: string): Promise<string | null> {
      return content
    }
  }()
  const manager = new Manager()
  manager.addTranslator('html', translator)
  expect(manager.htmlTranslator('html')).toBe(translator)
})

it('throws error when html translator cannot translate html', () => {
  const translator = new class implements Translator {
    async detect(content: string): Promise<string | null> {
      return content
    }
    async translate(content: string): Promise<string | null> {
      return content
    }
  }()
  const manager = new Manager()
  manager.addTranslator('html', translator)
  expect(() => manager.htmlTranslator('html'))
    .toThrow(new UnsupportedTranslatorError(
      'The translator does not support HTML translation.'
    ))
})
