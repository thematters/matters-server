import { ArticleContent, Connections } from 'definitions'
import { Classification, Classifier } from 'connectors/classification/manager'
import { Service } from './classification'
import { expect } from '@jest/globals'
import { genConnections, closeConnections } from 'connectors/__test__/utils'
import { registerMatcher } from './toHaveContentClassification'

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
  const content = await createTestContent()
  await service.classify(content.id)
  await expect(content.id).toHaveContentClassification(Classification.NORMAL)
})

it('persists the classification for variant content ids', async () => {
  const classifier = createStubClassifier(Classification.NORMAL)
  const service = new Service(connections, classifier)
  const html = await createTestContent('<h1>Greeting</h1>')
  const markdown = await createTestContent('# Greeting')
  await service.classify(html.id, [markdown.id])
  await expect(html.id).toHaveContentClassification(Classification.NORMAL)
  await expect(markdown.id).toHaveContentClassification(Classification.NORMAL)
})

it('throws error when the content could not be found', async () => {
  const classifier = createStubClassifier(Classification.NORMAL)
  const service = new Service(connections, classifier)
  await expect(service.classify('0'))
    .rejects
    .toThrow(new Error('The article content "0" does not exist.'))
})

it('skips classification when classifier does not have a result', async () => {
  const classifier = createStubClassifier(null)
  const service = new Service(connections, classifier)
  const content = await createTestContent('<h1>Greeting</h1>')
  await service.classify(content.id)
  await expect(content.id).not.toHaveContentClassification(Classification.NORMAL)
})

async function createTestContent(content = '<p>foo</p>') {
  const [record] = await connections.knex
    .table<ArticleContent>('article_content')
    .returning('id')
    .insert<[Pick<ArticleContent, 'id'>]>({
      content,
      hash: 'mock-hash-' + mockHash++,
    })

  return record
}

function createStubClassifier(classification: Classification | null) {
  return new (class implements Classifier {
    async classify(_content: string): Promise<Classification | null> {
      return classification
    }
  })()
}
