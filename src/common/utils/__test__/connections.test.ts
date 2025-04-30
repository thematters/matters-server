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

describe('cursor based pagination', () => {
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
})

describe('offset based pagination', () => {
  test('ascending order with first/after', async () => {
    // Test ascending order with first/after
    const query1 = knex<Article>('article').select('*')
    const connection1 = await connectionFromQuery({
      query: query1,
      orderBy: { column: 'id', order: 'asc' },
      args: { first: 2 },
    })
    expect(connection1.totalCount).toBeGreaterThan(2)
    expect(connection1.edges.length).toBe(2)
    expect(connection1.edges[0].node.id).toBe('1')
    expect(connection1.edges[1].node.id).toBe('2')
    expect(connection1.pageInfo.hasNextPage).toBe(true)
    expect(connection1.pageInfo.hasPreviousPage).toBe(false)

    // Test descending order with first/after
    const query2 = knex<Article>('article').select('*')
    const connection2 = await connectionFromQuery({
      query: query2,
      orderBy: { column: 'id', order: 'desc' },
      args: { first: 2 },
    })
    expect(connection2.totalCount).toBeGreaterThan(2)
    expect(connection2.edges.length).toBe(2)
    expect(connection2.edges[0].node.id).toBe('6')
    expect(connection2.edges[1].node.id).toBe('5')
    expect(connection2.pageInfo.hasNextPage).toBe(true)
    expect(connection2.pageInfo.hasPreviousPage).toBe(false)

    // Test with after cursor
    const query3 = knex<Article>('article').select('*')
    const connection3 = await connectionFromQuery({
      query: query3,
      orderBy: { column: 'id', order: 'asc' },
      args: { first: 2, after: connection1.edges[1].cursor },
    })
    expect(connection3.edges.length).toBe(2)
    expect(connection3.edges[0].node.id).toBe('3')
    expect(connection3.edges[1].node.id).toBe('4')
    expect(connection3.pageInfo.hasPreviousPage).toBe(true)

    // Test with includeAfter
    const query4 = knex<Article>('article').select('*')
    const connection4 = await connectionFromQuery({
      query: query4,
      orderBy: { column: 'id', order: 'asc' },
      args: {
        first: 2,
        after: connection1.edges[1].cursor,
        includeAfter: true,
      },
    })
    expect(connection4.edges.length).toBe(2)
    expect(connection4.edges[0].node.id).toBe('2')
    expect(connection4.edges[1].node.id).toBe('3')

    // Test with maxTake
    const query5 = knex<Article>('article').select('*')
    const connection5 = await connectionFromQuery({
      query: query5,
      orderBy: { column: 'id', order: 'asc' },
      args: { first: 5 },
      maxTake: 3,
    })
    expect(connection5.totalCount).toBe(3)
    expect(connection5.edges.length).toBe(3)
    expect(connection5.edges[0].node.id).toBe('1')
    expect(connection5.edges[1].node.id).toBe('2')
    expect(connection5.edges[2].node.id).toBe('3')
    expect(connection5.pageInfo.hasNextPage).toBe(false)

    // Test error case - use before with offset based pagination
    const query6 = knex<Article>('article').select('*')
    await expect(
      connectionFromQuery({
        query: query6,
        orderBy: { column: 'id', order: 'asc' },
        args: {
          before: connection1.edges[1].cursor,
        },
      })
    ).rejects.toThrow('Cannot use `before` with offset based pagination.')
  })
})
