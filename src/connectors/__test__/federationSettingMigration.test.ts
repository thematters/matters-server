import { pathToFileURL } from 'node:url'
import { jest } from '@jest/globals'

const migrationPath = pathToFileURL(
  `${process.cwd()}/db/migrations/20260503000000_create_federation_setting_tables.js`
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
  enu: jest.fn(() => createColumnBuilder()),
  timestamp: jest.fn(() => createColumnBuilder()),
  unique: jest.fn(),
  foreign: jest.fn(() => ({
    references: jest.fn(() => ({
      inTable: jest.fn(),
    })),
  })),
})

const createKnex = () => {
  const entityTypeQuery: any = {
    insert: jest.fn(),
    whereIn: jest.fn(() => entityTypeQuery),
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

describe('create federation setting tables migration', () => {
  test('creates durable author and article federation setting tables', async () => {
    const { knex, entityTypeQuery, tables } = createKnex()
    const { up } = await import(migrationPath)

    await up(knex)

    expect(knex).toHaveBeenCalledWith('entity_type')
    expect(entityTypeQuery.insert).toHaveBeenCalledWith([
      { table: 'user_federation_setting' },
      { table: 'article_federation_setting' },
    ])
    expect(knex.schema.createTable).toHaveBeenCalledWith(
      'user_federation_setting',
      expect.any(Function)
    )
    expect(knex.schema.createTable).toHaveBeenCalledWith(
      'article_federation_setting',
      expect.any(Function)
    )
    expect(tables[0].builder.unique).toHaveBeenCalledWith(['user_id'])
    expect(tables[1].builder.unique).toHaveBeenCalledWith(['article_id'])
  })

  test('drops federation setting tables and entity type rows on rollback', async () => {
    const { knex, entityTypeQuery } = createKnex()
    const { down } = await import(migrationPath)

    await down(knex)

    expect(knex.schema.dropTable).toHaveBeenCalledWith(
      'article_federation_setting'
    )
    expect(knex.schema.dropTable).toHaveBeenCalledWith(
      'user_federation_setting'
    )
    expect(entityTypeQuery.whereIn).toHaveBeenCalledWith('table', [
      'user_federation_setting',
      'article_federation_setting',
    ])
    expect(entityTypeQuery.del).toHaveBeenCalled()
  })
})
