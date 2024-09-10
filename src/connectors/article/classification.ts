import { Classification } from 'aws-sdk/clients/glue'
import { Classifier } from 'connectors/classification/manager'
import { ArticleContent, Connections } from 'definitions'

export interface ClassificationService {
  classify(contentId: string, variationIds?: string[]): Promise<void>
}

export class Service implements ClassificationService {
  #connections: Connections
  #classifier: Classifier

  constructor(connections: Connections, classifier: Classifier) {
    this.#connections = connections
    this.#classifier = classifier
  }

  async classify(contentId: string, variationIds?: string[]) {
    const content = await this.#getContent(contentId)

    if (!content) {
      throw new Error(`The article content "${contentId}" does not exist.`)
    }

    const classification = await this.#classifier.classify(content.content)

    if (classification === null) {
      return
    }

    await this.#persist([
      contentId,
      ...variationIds || []
    ], classification)
  }

  async #getContent(contentId: string) {
    return await this.#connections
      .knexRO<ArticleContent>('article_content')
      .where('id', contentId)
      .first()
  }

  async #persist(contentIds: string[], classification: Classification) {
    await this.#connections
      .knex('article_content_classification')
      .insert(contentIds.map((id) => ({
        content_id: id,
        classification,
      })))
  }
}
