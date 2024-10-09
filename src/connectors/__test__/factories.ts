import {
  Article,
  ArticleClassification,
  ArticleContent,
  ArticleVersion,
  Connections,
} from 'definitions'

export abstract class Factory<T extends Record<string, any>> {
  protected static connections: Connections
  protected abstract table: string

  static setConnections(connections: Connections) {
    Factory.connections = connections
  }

  async create(attributes: Partial<T> = {}): Promise<T> {
    const [record] = await Factory.connections.knex
      .table(this.table)
      .returning('*')
      .insert<[T]>({
        ...this.definition(),
        ...attributes,
      })

    return record as T
  }

  definition(): Partial<T> {
    return {
      // Define the default attributes ...
    }
  }
}

export class ArticleContentFactory extends Factory<ArticleContent> {
  protected table = 'article_content'
}

export class ArticleFactory extends Factory<Article> {
  protected table = 'article'
}

export class ArticleVersionFactory extends Factory<ArticleVersion> {
  protected table = 'article_version'

  definition(): Partial<ArticleVersion> {
    return {
      title: 'Test Title',
      summary: 'Test summary.',
      summaryCustomized: true,
      tags: [],
      connections: [],
      access: 'public',
      license: 'cc_0',
      canComment: true,
      sensitiveByAuthor: false,
    }
  }
}

export class ArticleClassificationFactory extends Factory<ArticleClassification> {
  protected table = 'article_classification'
}
