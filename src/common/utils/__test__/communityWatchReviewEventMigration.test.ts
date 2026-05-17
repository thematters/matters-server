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
  `${process.cwd()}/db/migrations/20260511001000_create_community_watch_review_event_table.js`
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

  knex.fn = { now: () => new Date('2026-05-11T00:00:00.000Z') }
  knex.schema = {
    createTable: async (table: string, callback) => {
      tableCalls.push(`create:${table}`)
      callback(createTableBuilder(tableCalls))
    },
    dropTable: async (table: string) => {
      droppedTables.push(table)
    },
  }

  return { knex, entityTypeInserts, entityTypeDeletes, tableCalls, droppedTables }
}

describe('community watch review event migration', () => {
  test('creates append-only staff review event table', async () => {
    const { up } = (await import(migrationUrl)) as Migration
    const { knex, entityTypeInserts, tableCalls } = createKnex()

    await up(knex)

    expect(entityTypeInserts).toEqual([
      { table: 'community_watch_review_event' },
    ])
    expect(tableCalls).toEqual(
      expect.arrayContaining([
        'create:community_watch_review_event',
        'bigIncrements:id',
        'uuid:uuid',
        'bigInteger:action_id',
        'enu:event_type',
        'bigInteger:actor_id',
        'text:old_value',
        'text:new_value',
        'text:note',
        'foreign:action_id',
        'foreign:actor_id',
        'index:action_id,created_at',
      ])
    )
  })

  test('drops event table and entity type on rollback', async () => {
    const { down } = (await import(migrationUrl)) as Migration
    const { knex, entityTypeDeletes, droppedTables } = createKnex()

    await down(knex)

    expect(entityTypeDeletes).toEqual([
      { table: 'community_watch_review_event' },
    ])
    expect(droppedTables).toEqual(['community_watch_review_event'])
  })
})
