import { TranslatorNotFoundError, UnsupportedTranslatorError } from './errors'
import { GoogleTranslate } from './googleTranslate'
import { HtmlTranslator, Manager, Translator } from './manager'
import { NullTranslator } from './nullTranslator'

it('should return the same instance for multiple calls to getInstance()', () => {
  const instance1 = new Manager({ default: 'default', drivers: {} }).asGlobal()
  const instance2 = Manager.getInstance()
  expect(instance1).toBe(instance2)
})

it('can add a translator', () => {
  const manager = new Manager({ default: 'default', drivers: {} })
  const driver = new NullTranslator()
  manager.addTranslator('null', driver)
  expect(manager.translator('null')).toBe(driver)
})

it('overrides a translator with the same name', () => {
  const manager = new Manager({ default: 'default', drivers: {} })
  const translator1 = new NullTranslator()
  const translator2 = new NullTranslator()
  manager.addTranslator('null', translator1)
  manager.addTranslator('null', translator2)
  expect(manager.translator('null')).toBe(translator2)
})

it('throws error when could not find specific translator', () => {
  const manager = new Manager({ default: 'default', drivers: {} })
  expect(() => manager.translator('null')).toThrow(new TranslatorNotFoundError(
    'Could not find "null" translator.'
  ))
})

it('retrieves the default translator if not specify', () => {
  const manager = new Manager({ default: 'one', drivers: {} })
  const driver1 = new NullTranslator()
  const driver2 = new NullTranslator()
  manager.addTranslator('one', driver1)
  manager.addTranslator('two', driver2)
  expect(manager.translator()).toBe(driver1)
})

it('throws error when there is no default translator', () => {
  const manager = new Manager({ default: 'default', drivers: {} })
  expect(() => manager.translator()).toThrow(new TranslatorNotFoundError(
    'Could not find "default" translator.'
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
  const manager = new Manager({ default: 'default', drivers: {} })
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
  const manager = new Manager({ default: 'default', drivers: {} })
  manager.addTranslator('html', translator)
  expect(() => manager.htmlTranslator('html'))
    .toThrow(new UnsupportedTranslatorError(
      'The translator does not support HTML translation.'
    ))
})

it('resolves google translator from config', () => {
  const manager = new Manager({
    default: 'default',
    drivers: {
      default: {
        driver: 'google',
        projectId: 'test-project',
      }
    }
  })
  expect(manager.translator()).toBeInstanceOf(GoogleTranslate)
})

it('throws error if missing project id when resolving google translator', () => {
  const manager = new Manager({
    default: 'default',
    drivers: {
      default: {
        driver: 'google',
      }
    }
  })
  expect(() => manager.translator()).toThrow(new Error('Missing project ID.'))
})
