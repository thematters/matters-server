import { pathToFileURL } from 'node:url'
import { jest } from '@jest/globals'

const migrationPath = pathToFileURL(
  `${process.cwd()}/db/migrations/20260513000000_create_federation_export_event_table.js`
).href

const createColumnBuilder = () => {
  const column: any = {
    unsigned: jest.fn(() => column),
    notNullable: jest.fn(() => column),
    defaultTo: jest.fn(() => column),
    primary: jest.fn(() => column),
  }

  return column
}

const createTableBuilder = () => ({
  bigIncrements: jest.fn(() => createColumnBuilder()),
  bigInteger: jest.fn(() => createColumnBuilder()),
  boolean: jest.fn(() => createColumnBuilder()),
  jsonb: jest.fn(() => createColumnBuilder()),
  string: jest.fn(() => createColumnBuilder()),
  timestamp: jest.fn(() => createColumnBuilder()),
  index: jest.fn(),
  foreign: jest.fn(() => ({
    references: jest.fn(() => ({
      inTable: jest.fn(),
    })),
  })),
})

const createKnex = () => {
  const entityTypeQuery: any = {
    insert: jest.fn(),
    where: jest.fn(() => entityTypeQuery),
    del: jest.fn(),
  }
  const tables: Array<{
    name: string
    builder: ReturnType<typeof createTableBuilder>
  }> = []
  const knex: any = jest.fn(() => entityTypeQuery)

  knex.fn = {
    now: jest.fn(() => 'now'),
  }
  knex.schema = {
    createTable: jest.fn((name: string, callback: any) => {
      const builder = createTableBuilder()
      tables.push({ name, builder })
      callback(builder)
    }),
    dropTable: jest.fn(),
  }

  return { entityTypeQuery, knex, tables }
}

describe('create federation export event table migration', () => {
  test('creates the export event audit table', async () => {
    const { knex, entityTypeQuery, tables } = createKnex()
    const { up } = await import(migrationPath)

    await up(knex)

    expect(knex).toHaveBeenCalledWith('entity_type')
    expect(entityTypeQuery.insert).toHaveBeenCalledWith({
      table: 'federation_export_event',
    })
    expect(knex.schema.createTable).toHaveBeenCalledWith(
      'federation_export_event',
      expect.any(Function)
    )
    expect(tables[0].builder.index).toHaveBeenCalledWith([
      'article_id',
      'created_at',
    ])
    expect(tables[0].builder.index).toHaveBeenCalledWith([
      'trigger',
      'mode',
      'created_at',
    ])
    expect(tables[0].builder.index).toHaveBeenCalledWith(['eligible', 'reason'])
  })

  test('drops the export event audit table on rollback', async () => {
    const { knex, entityTypeQuery } = createKnex()
    const { down } = await import(migrationPath)

    await down(knex)

    expect(knex.schema.dropTable).toHaveBeenCalledWith(
      'federation_export_event'
    )
    expect(entityTypeQuery.where).toHaveBeenCalledWith({
      table: 'federation_export_event',
    })
    expect(entityTypeQuery.del).toHaveBeenCalled()
  })
})
