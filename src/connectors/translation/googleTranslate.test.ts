import { TranslationServiceClient, protos } from '@google-cloud/translate'
import { GoogleTranslate } from './googleTranslate'
import { LANGUAGE } from 'common/enums'

type DetectLanguageResponse =
  protos.google.cloud.translation.v3.IDetectLanguageResponse

type TranslateTextResponse =
  protos.google.cloud.translation.v3.ITranslateTextResponse

describe('google translate', () => {
  let mockClient: jest.Mocked<TranslationServiceClient>
  let translator: GoogleTranslate

  beforeEach(() => {
    mockClient = {
      detectLanguage: jest.fn(),
      translateText: jest.fn(),
    } as unknown as jest.Mocked<TranslationServiceClient>

    translator = new GoogleTranslate(mockClient, 'test-project')
  })

  it('can detect language of the content', async () => {
    const mockResponse: DetectLanguageResponse = {
      languages: [
        { languageCode: 'en' }
      ]
    }
    mockClient.detectLanguage.mockImplementation(async () => [mockResponse])
    const language = await translator.detect('foo')
    expect(language).toBe('en')
    expect(mockClient.detectLanguage).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'foo' })
    )
  })

  it('returns null when missing languages in response', async () => {
    const mockResponse: DetectLanguageResponse = {}
    mockClient.detectLanguage.mockImplementation(async () => [mockResponse])
    const languages = await translator.detect('foo')
    expect(languages).toBeNull()
  })

  it('returns null when missing language code', async () => {
    const mockResponse: DetectLanguageResponse = {
      languages: [
        { /** intended empty */ }
      ]
    }
    mockClient.detectLanguage.mockImplementation(async () => [mockResponse])
    const languages = await translator.detect('foo')
    expect(languages).toBeNull()
  })

  it('can translate content to target language', async () => {
    const mockResponse: TranslateTextResponse = {
      translations: [
        { translatedText: 'bar' }
      ]
    }
    mockClient.translateText.mockImplementation(async () => [mockResponse])
    const translated = await translator.translate('foo', 'beep')
    expect(translated).toBe('bar')
    expect(mockClient.translateText).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: ['foo'],
        mimeType: 'text/plain',
        targetLanguageCode: 'beep'
      })
    )
  })

  it('can translate html content to target language', async () => {
    const mockResponse: TranslateTextResponse = {
      translations: [
        { translatedText: '<p>bar</p>' }
      ]
    }
    mockClient.translateText.mockImplementation(async () => [mockResponse])
    const translated = await translator.translateHtml('<p>foo</p>', 'beep')
    expect(translated).toBe('<p>bar</p>')
    expect(mockClient.translateText).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: ['<p>foo</p>'],
        mimeType: 'text/html',
        targetLanguageCode: 'beep'
      })
    )
  })

  it('returns null if missing translations in response', async () => {
    const mockResponse: TranslateTextResponse = {}
    mockClient.translateText.mockImplementation(async () => [mockResponse])
    const translated = await translator.translate('foo', 'beep')
    expect(translated).toBeNull()
  })

  it('returns null if missing translation text', async () => {
    const mockResponse: TranslateTextResponse = {
      translations: [
        { /** intended empty */ }
      ]
    }
    mockClient.translateText.mockImplementation(async () => [mockResponse])
    const translated = await translator.translate('foo', 'beep')
    expect(translated).toBeNull()
  })
})

describe('ManageInternalLanguage', () => {
  const translator = new GoogleTranslate(
    new TranslationServiceClient(), 'test-project'
  )

  describe('toTargetLanguage', () => {
    it('converts language in cldr format to iso-639 code', () => {
      expect(translator.toTargetLanguage('en')).toBe('en')
      expect(translator.toTargetLanguage('en_US')).toBe('en')
    })

    it('converts language to Chinese Simplified if script sub-tag is Hans', () => {
      expect(translator.toTargetLanguage('zh_Hans')).toBe('zh-CN')
    })

    it('converts language to Chinese Simplified if region sub-tag is CN', () => {
      expect(translator.toTargetLanguage('zh_CN')).toBe('zh-CN')
    })

    it('converts language to Chinese Traditional if script sub-tag is Hant', () => {
      expect(translator.toTargetLanguage('zh_Hant')).toBe('zh-TW')
    })

    it('converts language to Chinese Traditional if region sub-tag is TW', () => {
      expect(translator.toTargetLanguage('zh_TW')).toBe('zh-TW')
    })
  })

  describe('toInternalLanguage', () => {
    it('normalizes to Simplified Chinese if script sub-tag is Hans', () => {
      expect(translator.toInternalLanguage('zh-Hans')).toBe(LANGUAGE.zh_hans)
    })

    it('normalizes to Simplified Chinese if region sub-tag is CN', () => {
      expect(translator.toInternalLanguage('zh-CN')).toBe(LANGUAGE.zh_hans)
    })

    it('normalizes to Traditional Chinese if script sub-tag is Hant', () => {
      expect(translator.toInternalLanguage('zh-Hant')).toBe(LANGUAGE.zh_hant)
    })

    it('normalizes to Traditional Chinese if region sub-tag is TW', () => {
      expect(translator.toInternalLanguage('zh-TW')).toBe(LANGUAGE.zh_hant)
    })

    it('skips normalizing for any other BCP 47 codes', () => {
      expect(translator.toInternalLanguage('en')).toBe(LANGUAGE.en)
      expect(translator.toInternalLanguage('en-US')).toBe('en-US')
      expect(translator.toInternalLanguage('fr')).toBe('fr')
    })
  })
})
