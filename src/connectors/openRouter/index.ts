import { environment } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import { extractAndTranslateHtml } from '#common/utils/index.js'
import { GQLTranslationModel, LANGUAGES } from '#definitions/index.js'

const logger = getLogger('service-openrouter')

type TranslationModel =
  | 'google/gemini-2.5-flash-preview'
  | 'google/gemini-2.0-flash-001'
  | 'openai/gpt-4.1-nano'
  | 'openai/gpt-4o-mini'
  | 'x-ai/grok-3-mini-beta'

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

    this.defaultModel = 'google/gemini-2.5-flash-preview'
    this.availableModels = [
      'google/gemini-2.5-flash-preview',
      'google/gemini-2.0-flash-001',
      'openai/gpt-4.1-nano',
      'openai/gpt-4o-mini',
      'x-ai/grok-3-mini-beta',
    ]
  }

  public toDatabaseModel = (model: TranslationModel): GQLTranslationModel => {
    const modelMap: { [key: string]: GQLTranslationModel } = {
      'google/gemini-2.5-flash-preview': 'google_gemini_2_5_flash_preview',
      'google/gemini-2.0-flash-001': 'google_gemini_2_0_flash_001',
      'openai/gpt-4.1-nano': 'openai_gpt_4_1_nano',
      'openai/gpt-4o-mini': 'openai_gpt_4o_mini',
      'x-ai/grok-3-mini-beta': 'xai_grok_3_mini_beta',
    }
    return modelMap[model]
  }

  public fromDatabaseModel = (model: GQLTranslationModel): TranslationModel => {
    const modelMap: { [key: string]: TranslationModel } = {
      google_gemini_2_5_flash_preview: 'google/gemini-2.5-flash-preview',
      google_gemini_2_0_flash_001: 'google/gemini-2.0-flash-001',
      openai_gpt_4_1_nano: 'openai/gpt-4.1-nano',
      openai_gpt_4o_mini: 'openai/gpt-4o-mini',
      xai_grok_3_mini_beta: 'x-ai/grok-3-mini-beta',
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
      logger.error(err)
      return
    }
  }

  /**
   * Translate HTML content preserving structure
   */
  public translateHtml = async (
    html: string,
    targetLanguage: LANGUAGES,
    model?: GQLTranslationModel
  ): Promise<{ text: string; model: GQLTranslationModel } | undefined> => {
    const translator = async (
      texts: string[]
    ): Promise<{ translations: string[]; model: GQLTranslationModel }> => {
      const messages = [
        {
          role: 'system',
          content: `You are a professional translator. Translate the provided article to ${this.toLanguageName(
            targetLanguage
          )}. The article is split into segments in the array.
IMPORTANT:
- Return exactly the same number of segments in the array as provided, maintaining the original array length
- Translate each segment independently
- Preserve formatting within each segment and maintain the original tone, terminology, and writing style
- Only return the translated text without explanations`,
        },
        {
          role: 'user',
          content: JSON.stringify(texts),
        },
      ]

      // Call OpenRouter API with structured output for HTML translation
      const apiResult = await this.makeCompletions(messages, model, true)

      if (!apiResult) {
        throw new Error('Translation failed')
      }

      return {
        translations: JSON.parse(apiResult.text),
        model: apiResult.model,
      }
    }

    // Process the HTML with our translator
    const result = await extractAndTranslateHtml(html, translator)

    if (!result?.html || !result?.model) return

    return {
      text: result.html,
      model: result.model,
    }
  }

  /**
   * Translate plain text
   */
  public translate = async (
    text: string,
    targetLanguage: LANGUAGES,
    model?: GQLTranslationModel
  ): Promise<{ text: string; model: GQLTranslationModel } | undefined> => {
    const messages = [
      {
        role: 'system',
        content: `You are a professional translator. Translate text to ${this.toLanguageName(
          targetLanguage
        )}. Maintain the original formats, tone and terminology. Only return the translated text without explanations.`,
      },
      {
        role: 'user',
        content: text,
      },
    ]

    const result = await this.makeCompletions(messages, model)

    if (!result) return

    return {
      text: result.text,
      model: result.model,
    }
  }
}

export const openRouter = new OpenRouter()
