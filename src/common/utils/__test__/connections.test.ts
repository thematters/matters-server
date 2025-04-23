import type { Knex } from 'knex'
import type { Connections, Article } from '#definitions/index.js'

import { genConnections, closeConnections } from '#connectors/__test__/utils.js'
import { connectionFromQuery } from '#common/utils/connections.js'

let connections: Connections
let knex: Knex

beforeAll(async () => {
  connections = await genConnections()
  knex = connections.knex
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

test('maxTake', async () => {
  const query1 = knex<Article>('article')
  const connection1 = await connectionFromQuery({
    query: query1,
    orderBy: { column: 'id', order: 'desc' },
    cursorColumn: 'id',
    args: { first: 1 },
    maxTake: 2,
  })
  expect(connection1.totalCount).toBe(2)
  expect(connection1.edges.length).toBe(1)
  expect(connection1.edges[0].node.id).toBe('6')

  const query2 = knex<Article>('article')
  const connection2 = await connectionFromQuery({
    query: query2,
    orderBy: { column: 'id', order: 'asc' },
    cursorColumn: 'id',
    args: { first: 1 },
    maxTake: 2,
  })
  expect(connection2.totalCount).toBe(2)
  expect(connection2.edges.length).toBe(1)
  expect(connection2.edges[0].node.id).toBe('1')
})
