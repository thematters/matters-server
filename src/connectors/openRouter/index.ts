import { environment } from '#common/environment.js'
import { TranslationInsufficientCreditsError } from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import {
  extractAndReplaceUrls,
  restoreUrlPlaceholders,
} from '#common/utils/index.js'
import { GQLTranslationModel, LANGUAGES } from '#definitions/index.js'
import * as Sentry from '@sentry/node'

const logger = getLogger('service-openrouter')

type TranslationModel =
  | 'google/gemini-2.5-flash-preview-05-20'
  | 'google/gemini-2.0-flash-001'

type OpenRouterResponse = {
  id: string
  model: string
  choices: Array<{
    logprobs: null
    finish_reason: string
    native_finish_reason: string
    index: number
    message: {
      role: string
      content: string
      refusal: null
      reasoning: null
    }
  }>
}

export class OpenRouter {
  private apiKey: string
  public defaultModel: TranslationModel
  public availableModels: TranslationModel[]

  public constructor() {
    this.apiKey = environment.openRouterApiKey

    this.defaultModel = 'google/gemini-2.5-flash-preview-05-20'
    this.availableModels = [
      'google/gemini-2.5-flash-preview-05-20',
      'google/gemini-2.0-flash-001',
    ]
  }

  public toDatabaseModel = (model: TranslationModel): GQLTranslationModel => {
    const modelMap: { [key: string]: GQLTranslationModel } = {
      'google/gemini-2.5-flash-preview-05-20': 'google_gemini_2_5_flash',
      'google/gemini-2.0-flash-001': 'google_gemini_2_0_flash',
    }
    return modelMap[model]
  }

  public fromDatabaseModel = (model: GQLTranslationModel): TranslationModel => {
    const modelMap: { [key: string]: TranslationModel } = {
      google_gemini_2_5_flash: 'google/gemini-2.5-flash-preview-05-20',
      google_gemini_2_0_flash: 'google/gemini-2.0-flash-001',
    }
    return modelMap[model]
  }

  public toLanguageName = (languageCode: LANGUAGES): string => {
    const languageMap: { [key in LANGUAGES]?: string } = {
      en: 'English',
      zh_hans: '简体中文',
      zh_hant: '繁體中文',
    }
    return languageMap[languageCode] || languageCode
  }

  private makeCompletions = async (
    messages: Array<{ role: string; content: string }>,
    model?: GQLTranslationModel,
    useStructuredOutput: boolean = false
  ): Promise<{ text: string; model: GQLTranslationModel } | undefined> => {
    if (!this.apiKey) {
      logger.error('OpenRouter API key is not configured')
      return
    }

    const currentModel = model
      ? this.fromDatabaseModel(model)
      : this.defaultModel
    const fallbackModels = this.availableModels
      .filter((m) => m !== currentModel)
      .slice(0, 2)

    try {
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: currentModel,
            models: fallbackModels,
            messages,
            temperature: 0.2,
            ...(useStructuredOutput
              ? {
                  response_format: {
                    type: 'json_schema',
                    json_schema: {
                      name: 'translation',
                      strict: true,
                      schema: {
                        type: 'array',
                        items: {
                          type: 'string',
                        },
                        description: 'Array of translated text segments',
                      },
                    },
                  },
                }
              : {}),
          }),
        }
      )

      if (!response.ok) {
        // Handle insufficient credits specifically
        // https://openrouter.ai/docs/api-reference/errors#error-codes
        if (response.status === 402) {
          logger.error('OpenRouter insufficient credits')
          throw new TranslationInsufficientCreditsError('insufficient credits')
        }

        // For other errors, fall back to basic error handling
        const error = await response.text()
        logger.error(error)
        return
      }

      const data = (await response.json()) as OpenRouterResponse

      if (!data.choices || data.choices.length === 0) {
        logger.error('No translation returned from OpenRouter')
        return
      }

      return {
        text: data.choices[0].message.content.trim(),
        model: this.availableModels.includes(data.model as TranslationModel)
          ? this.toDatabaseModel(data.model as TranslationModel)
          : model || this.toDatabaseModel(this.defaultModel),
      }
    } catch (err) {
      // Re-throw our custom insufficient credits error
      if (err instanceof TranslationInsufficientCreditsError) {
        throw err
      }

      logger.error(err)
      Sentry.captureException(err)
      return
    }
  }

  /**
   * Translate arbitrary text
   */
  public translate = async (
    text: string,
    targetLanguage: LANGUAGES,
    model?: GQLTranslationModel,
    html?: boolean
  ): Promise<{ text: string; model: GQLTranslationModel } | undefined> => {
    // Replace URLs with placeholders to reduce token usage
    let urlMap: Map<string, string> | undefined
    if (html) {
      const processed = extractAndReplaceUrls(text)
      text = processed.html
      urlMap = processed.urlMap
    }

    const targetLanguageName = this.toLanguageName(targetLanguage)
    let messages = []
    const extraInstruction =
      targetLanguage === 'zh_hant'
        ? '- Use wording and style natural to Taiwanese readers. Avoid Mainland China terms.'
        : ''

    if (html) {
      messages = [
        {
          role: 'system',
          content: `You are a professional translator. You must respond in ${targetLanguageName}.
IMPORTANT:
- Preserve all HTML formatting, attributes and structure.
- DO NOT translate mentions (e.g., @username).
- Maintain the original formats, tone and terminology.
- Only return the translated text without explanations.
${extraInstruction}`,
        },
        {
          role: 'user',
          content: `Translate the following HTML content to ${targetLanguageName}:`,
        },
        { role: 'user', content: text },
      ]
    } else {
      messages = [
        {
          role: 'system',
          content: `You are a professional translator. You must respond in ${targetLanguageName}.
IMPORTANT:
- Maintain the original formats, tone and terminology.
- Only return the translated text without explanations.
${extraInstruction}`,
        },
        {
          role: 'user',
          content: `Translate the following text to ${targetLanguageName}:`,
        },
        { role: 'user', content: text },
      ]
    }

    const result = await this.makeCompletions(messages, model)

    if (!result) return

    // Restore URL placeholders if HTML content
    if (html && urlMap) {
      return {
        text: restoreUrlPlaceholders(result.text, urlMap),
        model: result.model,
      }
    }

    return {
      text: result.text,
      model: result.model,
    }
  }
}

export const openRouter = new OpenRouter()
