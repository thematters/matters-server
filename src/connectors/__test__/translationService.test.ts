import type { Connections } from 'definitions'

import { LANGUAGE } from 'common/enums'
import { TranslationService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let translationService: TranslationService

beforeAll(async () => {
  connections = await genConnections()
  translationService = new TranslationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('updateOrCreateTranslation', async () => {
  const translation = await translationService.updateOrCreateTranslation({
    table: 'campaign',
    field: 'name',
    language: LANGUAGE.zh_hant,
    id: '1',
    text: 'test',
  })
  expect(translation).toBeDefined()
  expect(translation.text).toBe('test')

  // update
  const updated = await translationService.updateOrCreateTranslation({
    table: 'campaign',
    field: 'name',
    language: LANGUAGE.zh_hant,
    id: '1',
    text: 'test2',
  })
  expect(updated).toBeDefined()
  expect(updated.text).toBe('test2')
  expect(updated.id).toBe(translation.id)

  // find
  const found = await translationService.findTranslation({
    table: 'campaign',
    field: 'name',
    language: LANGUAGE.zh_hant,
    id: '1',
  })
  expect(found).toBeDefined()

  const notFound = await translationService.findTranslation({
    table: 'campaign',
    field: 'name',
    language: LANGUAGE.zh_hant,
    id: '2',
  })

  expect(notFound).toBeUndefined()
})
