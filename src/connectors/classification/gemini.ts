import {
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
  VertexAI,
} from '@google-cloud/vertexai'

import { Classification, Classifier } from './manager'
import { createPrompt } from './prompt'

export class Gemini implements Classifier {
  #client: VertexAI
  #model: string

  constructor(client: VertexAI, model = 'gemini-1.5-flash-001') {
    this.#client = client
    this.#model = model
  }

  async classify(content: string): Promise<Classification | null> {
    const generativeModel = this.#client.preview.getGenerativeModel({
      model: this.#model,
      generationConfig: {
        maxOutputTokens: 64,
        temperature: 1,
        topP: 0.95,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            category: {
              type: SchemaType.STRING,
            },
          },
        },
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    })

    const { response } = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: createPrompt(content) }] }],
    })

    for (const candidate of response.candidates ?? []) {
      for (const part of candidate.content.parts) {
        try {
          if (part.text) {
            const result = JSON.parse(part.text)
            if (typeof result === 'object' && 'category' in result) {
              if (Object.values(Classification).includes(result.category)) {
                return result.category
              }
            }
          }
        } catch (e) {
          continue
        }
      }
    }

    return null
  }
}
