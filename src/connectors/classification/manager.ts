import { VertexAI, VertexInit } from '@google-cloud/vertexai'
import { Gemini } from './gemini'
import { NullClassifier } from './nullClassifier'

export enum Classification {
  NORMAL = 'normal',
  SPAM = 'spam',
}

export interface Classifier {
  classify(content: string): Promise<Classification | null>
}

export interface ClassificationManager {
  add(name: string, classifier: Classifier): this
  classifier(name: string): Classifier
}

export type ClassificationGeminiConfig = {
  driver: 'gemini'
  model?: string
} & VertexInit

export type ClassificationNullConfig = {
  driver: 'null'
}

export type ClassificationManagerConfig = {
  default: string
  drivers: {
    [name: string]: ClassificationGeminiConfig | ClassificationNullConfig
  }
}

export class Manager implements ClassificationManager {
  static #instance: Manager

  #config: ClassificationManagerConfig

  #resolved: {
    [name: string]: Classifier
  } = {}

  constructor(config: ClassificationManagerConfig) {
    this.#config = config
  }

  add(name: string, classifier: Classifier): this {
    this.#resolved[name] = classifier

    return this
  }

  classifier(name?: string | null): Classifier {
    if (typeof name === 'string') {
      return this.#resolve(name)
    }

    return this.#resolve(this.#config['default'])
  }

  #resolve(name: string): Classifier {
    const classifier = this.#resolved[name]

    if (classifier) {
      return classifier
    }

    return (this.#resolved[name] = this.#make(name))
  }

  #make(name: string): Classifier {
    const config = this.#config.drivers[name]

    if (!config) {
      throw new Error(`Could not find "${name}" classifier.`)
    }

    switch (config.driver) {
      case 'gemini':
        return this.#makeGeminiDriver(config)
      case 'null':
        return this.#makeNullDriver()
      default:
        throw new Error(`Unsupported "${name}" classification driver.`)
    }
  }

  #makeGeminiDriver(config: ClassificationGeminiConfig) {
    const { ['driver']: driver, ['model']: model, ...init } = config
    const client = new VertexAI(init)
    return new Gemini(client, model)
  }

  #makeNullDriver() {
    return new NullClassifier()
  }

  asGlobal() {
    Manager.#instance = this
    return this
  }

  static getInstance() {
    const instance = Manager.#instance

    if (!instance) {
      throw new Error('Missing global classification manager.')
    }

    return instance
  }
}
