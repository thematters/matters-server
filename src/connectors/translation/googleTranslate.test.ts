import { TranslationServiceClient, protos } from '@google-cloud/translate'
import { GoogleTranslate } from './googleTranslate'

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
