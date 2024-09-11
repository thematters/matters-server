import { Knex } from 'knex'

import { Classification, Classifier } from 'connectors/classification/manager'
import { ArticleContent, ArticleVersion, Connections } from 'definitions'

export interface ClassificationService {
  classify(articleVersionId: string): Promise<void>
}

export class Service implements ClassificationService {
  #connections: Connections
  #classifier: Classifier

  constructor(connections: Connections, classifier: Classifier) {
    this.#connections = connections
    this.#classifier = classifier
  }

  async classify(articleVersionId: string) {
    const version = await this.#getArticleVersion(articleVersionId)

    if (!version) {
      throw new Error(
        `The article version "${articleVersionId}" does not exist.`
      )
    }

    const classification = await this.#classify(version)

    if (classification === null) {
      return
    }

    await this.#persist(articleVersionId, classification)
  }

  async #getArticleVersion(articleVersionId: string) {
    return await this.#connections
      .knexRO<ArticleVersion>('article_version')
      .where('id', articleVersionId)
      .first()
  }

  async #getArticleContent(contentId: string) {
    const content = await this.#connections
      .knexRO<ArticleContent>('article_content')
      .where('id', contentId)
      .first()

    if (!content) {
      throw new Error(
        `Could not find the article content with ID "${contentId}".`
      )
    }

    return content
  }

  async #classify(articleVersion: ArticleVersion) {
    const { content } = await this.#getArticleContent(articleVersion.contentId)

    return this.#classifier.classify(
      `${articleVersion.title}\n\n${articleVersion.summary}\n\n${content}`
    )
  }

  async #persist(articleVersionId: string, classification: Classification) {
    await this.#connections.knex('article_classification').insert({
      article_version_id: articleVersionId,
      classification,
    })
  }
}

/**
 * A query snippet to filter out inappropriate articles by classification.
 */
export function withClassificationFiltering(
  query: Knex.QueryBuilder,
  options: {
    enable: true
    articleTable: 'article'
    strict: true
  }
) {
  if (!options.enable) {
    return
  }

  query
    .leftJoin(
      'article_version_newest as latest',
      'latest.article_id',
      `${options.articleTable}.id`
    )
    .leftJoin(
      'article_classification as ac',
      'ac.article_version_id',
      'latest.id'
    )
    .andWhere((query) => {
      query.where('ac.classification', Classification.NORMAL)

      if (!options.strict) {
        query.orWhereNull('ac.classification')
      }
    })
}
