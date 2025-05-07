import { environment } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import { GQLTranslationModel } from '#root/src/definitions/index.js'

const logger = getLogger('service-openrouter')

type TranslationModel =
  | 'google/gemini-2.5-flash-preview'
  | 'openai/gpt-4.1-nano'

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

// type OpenRouterErrorResponse = {
//   error: {
//     code: number
//     message: string
//     metadata?: Record<string, unknown>
//   }
// }

export class OpenRouter {
  private apiKey: string
  public defaultModel: TranslationModel
  public availableModels: TranslationModel[]

  public constructor() {
    this.apiKey = environment.openRouterApiKey

    this.defaultModel = 'google/gemini-2.5-flash-preview'

    this.availableModels = [
      'google/gemini-2.5-flash-preview',
      'openai/gpt-4.1-nano',
    ]
  }

  public toDatabaseModel = (model: TranslationModel): GQLTranslationModel => {
    const modelMap: { [key: string]: GQLTranslationModel } = {
      'google/gemini-2.5-flash-preview': 'google_gemini_2_5_flash_preview',
      'openai/gpt-4.1-nano': 'openai_gpt_4_1_nano',
    }
    return modelMap[model]
  }

  public fromDatabaseModel = (model: GQLTranslationModel): TranslationModel => {
    const modelMap: { [key: string]: TranslationModel } = {
      google_gemini_2_5_flash_preview: 'google/gemini-2.5-flash-preview',
      openai_gpt_4_1_nano: 'openai/gpt-4.1-nano',
    }
    return modelMap[model]
  }

  public translate = async (
    text: string,
    targetLanguage: string,
    model?: GQLTranslationModel
  ): Promise<{ text: string; model: GQLTranslationModel } | undefined> => {
    if (!this.apiKey) {
      logger.error('OpenRouter API key is not configured')
      return
    }

    const currentModel = model
      ? this.fromDatabaseModel(model)
      : this.defaultModel
    const fallbackModels = this.availableModels.filter(
      (m) => m !== currentModel
    )

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
            messages: [
              {
                role: 'system',
                content: `You are a professional translator. Translate text to ${targetLanguage}. Maintain the original formats, tone and terminology. Only return the translated text without explanations.`,
              },
              {
                role: 'user',
                content: text,
              },
            ],
            temperature: 0.2,
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
        model:
          data.model &&
          this.availableModels.includes(data.model as TranslationModel)
            ? this.toDatabaseModel(data.model as TranslationModel)
            : this.toDatabaseModel(currentModel),
      }
    } catch (err) {
      logger.error(err)
      return
    }
  }
}

export const openRouter = new OpenRouter()
