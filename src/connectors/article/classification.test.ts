import { expect } from '@jest/globals'

import { genConnections, closeConnections } from 'connectors/__test__/utils'
import { Classification, Classifier } from 'connectors/classification/manager'
import {
  Article,
  ArticleContent,
  ArticleVersion,
  Connections,
} from 'definitions'

import { Service } from './classification'
import { registerMatcher } from './toHaveArticleClassification'

let connections: Connections
let mockHash = 0

beforeAll(async () => {
  connections = await genConnections()
  registerMatcher(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

it('classifies the article content', async () => {
  const classifier = createStubClassifier(Classification.NORMAL)
  const service = new Service(connections, classifier)
  const [version] = await createTestArticleVersion()
  await service.classify(version.id)
  await expect(version.id).toHaveArticleClassification(Classification.NORMAL)
})

it('throws error when the article version could not be found', async () => {
  const classifier = createStubClassifier(Classification.NORMAL)
  const service = new Service(connections, classifier)
  await expect(service.classify('0')).rejects.toThrow(
    new Error('The article version "0" does not exist.')
  )
})

it('skips classification when classifier does not have a result', async () => {
  const classifier = createStubClassifier(null)
  const service = new Service(connections, classifier)
  const [version] = await createTestArticleVersion('<h1>Greeting</h1>')
  await service.classify(version.id)
  await expect(version.id).not.toHaveArticleClassification(
    Classification.NORMAL
  )
})

async function createTestArticleVersion(html = '<p>foo</p>') {
  const [article] = await connections.knex
    .table<Article>('article')
    .returning('id')
    .insert<[Pick<Article, 'id'>]>({ authorId: '1' })

  const [content] = await connections.knex
    .table<ArticleContent>('article_content')
    .returning('id')
    .insert<[Pick<ArticleContent, 'id'>]>({
      content: html,
      hash: 'mock-hash-' + mockHash++,
    })

  const [version] = await connections.knex
    .table<ArticleVersion>('article_version')
    .returning('id')
    .insert<[Pick<ArticleVersion, 'id'>]>({
      articleId: article.id,
      title: 'Test Title',
      summary: 'Test summary.',
      summaryCustomized: true,
      contentId: content.id,
      tags: [],
      connections: [],
      wordCount: html.length,
      access: 'public',
      license: 'cc_0',
      canComment: true,
      sensitiveByAuthor: false,
    })

  return [version, content, article]
}

function createStubClassifier(classification: Classification | null) {
  return new (class implements Classifier {
    async classify(_content: string): Promise<Classification | null> {
      return classification
    }
  })()
}
