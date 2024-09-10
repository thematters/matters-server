import { Classification } from 'connectors/classification/manager'
import { Connections } from 'definitions'

export function registerMatcher(connections: Connections) {
  async function toHaveContentClassification(contentId: string, expected: Classification) {
    const record = await connections.knexRO
      .table('article_content_classification')
      .where({
        content_id: contentId,
        classification: expected,
      })
      .first()

    if (record) {
      return {
        message: () => `The article content "${contentId}" has a classification of "${expected}".`,
        pass: true,
      }
    }

    return {
      message: () => `The article content "${contentId}" does not have a classification of "${expected}".`,
      pass: false,
    }
  }

  expect.extend({
    toHaveContentClassification,
  })
}

declare module 'expect' {
  interface AsymmetricMatchers {
    toHaveContentClassification(classification: Classification): Promise<void>
  }

  interface Matchers<R> {
    toHaveContentClassification(classification: Classification): Promise<R>
  }
}
