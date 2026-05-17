import { pathToFileURL } from 'url'

type Migration = {
  up: (knex: MockKnex) => Promise<void>
  down: (knex: MockKnex) => Promise<void>
}

type MockKnex = {
  (table: string): {
    insert: (data: Record<string, string>) => Promise<void>
    where: (query: Record<string, string>) => {
      del: () => Promise<void>
    }
  }
  fn: {
    now: () => Date
  }
  raw: (sql: string) => Promise<void>
  schema: {
    createTable: (
      table: string,
      callback: (tableBuilder: MockTableBuilder) => void
    ) => Promise<void>
    dropTable: (table: string) => Promise<void>
  }
}

type MockTableBuilder = Record<string, (...args: any[]) => MockTableBuilder>

const migrationUrl = pathToFileURL(
  `${process.cwd()}/db/migrations/20260510001000_create_community_watch_action_table.js`
).href

const createTableBuilder = (calls: string[]) => {
  const builder = new Proxy(
    {},
    {
      get: (_, prop: string) => {
        if (prop === 'foreign') {
          return (column: string) => {
            calls.push(`foreign:${column}`)
            return builder
          }
        }
        if (['references', 'inTable', 'notNullable', 'unique'].includes(prop)) {
          return () => builder
        }
        return (...args: any[]) => {
          calls.push(`${prop}:${args[0] ?? ''}`)
          return builder
        }
      },
    }
  )
  return builder as MockTableBuilder
}

const createKnex = () => {
  const entityTypeInserts: Array<Record<string, string>> = []
  const entityTypeDeletes: Array<Record<string, string>> = []
  const rawCalls: string[] = []
  const tableCalls: string[] = []
  const droppedTables: string[] = []

  const knex = ((table: string) => ({
    insert: async (data: Record<string, string>) => {
      entityTypeInserts.push(data)
    },
    where: (query: Record<string, string>) => ({
      del: async () => {
        entityTypeDeletes.push(query)
      },
    }),
  })) as MockKnex

  knex.fn = { now: () => new Date('2026-05-10T00:00:00.000Z') }
  knex.raw = async (sql: string) => {
    rawCalls.push(sql)
  }
  knex.schema = {
    createTable: async (table: string, callback) => {
      tableCalls.push(`create:${table}`)
      callback(createTableBuilder(tableCalls))
    },
    dropTable: async (table: string) => {
      droppedTables.push(table)
    },
  }

  return {
    knex,
    entityTypeInserts,
    entityTypeDeletes,
    rawCalls,
    tableCalls,
    droppedTables,
  }
}

describe('community watch action migration', () => {
  test('creates audit table, indexes, and active comment uniqueness', async () => {
    const { up } = (await import(migrationUrl)) as Migration
    const { knex, entityTypeInserts, rawCalls, tableCalls } = createKnex()

    await up(knex)

    expect(entityTypeInserts).toEqual([{ table: 'community_watch_action' }])
    expect(tableCalls).toEqual(
      expect.arrayContaining([
        'create:community_watch_action',
        'bigIncrements:id',
        'uuid:uuid',
        'enu:reason',
        'timestamp:content_expires_at',
        'foreign:comment_id',
        'foreign:actor_id',
        'index:comment_id',
      ])
    )
    expect(rawCalls).toEqual([
      expect.stringContaining(
        'CREATE UNIQUE INDEX community_watch_action_comment_id_active_unique'
      ),
    ])
  })

  test('drops index, entity type, and audit table on rollback', async () => {
    const { down } = (await import(migrationUrl)) as Migration
    const { knex, entityTypeDeletes, rawCalls, droppedTables } = createKnex()

    await down(knex)

    expect(rawCalls).toEqual([
      'DROP INDEX IF EXISTS community_watch_action_comment_id_active_unique',
    ])
    expect(entityTypeDeletes).toEqual([{ table: 'community_watch_action' }])
    expect(droppedTables).toEqual(['community_watch_action'])
  })
})
