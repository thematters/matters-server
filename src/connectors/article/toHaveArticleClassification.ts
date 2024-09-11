import { Classification } from 'connectors/classification/manager'
import { Connections } from 'definitions'

export function registerMatcher(connections: Connections) {
  async function toHaveArticleClassification(
    versionId: string,
    expected: Classification
  ) {
    const record = await connections.knexRO
      .table('article_classification')
      .where({
        article_version_id: versionId,
        classification: expected,
      })
      .first()

    if (record) {
      return {
        message: () =>
          `The article version "${versionId}" has a classification of "${expected}".`,
        pass: true,
      }
    }

    return {
      message: () =>
        `The article content "${versionId}" does not have a classification of "${expected}".`,
      pass: false,
    }
  }

  expect.extend({
    toHaveArticleClassification,
  })
}

declare module 'expect' {
  interface AsymmetricMatchers {
    toHaveArticleClassification(classification: Classification): Promise<void>
  }

  interface Matchers<R> {
    toHaveArticleClassification(classification: Classification): Promise<R>
  }
}
