import { pathToFileURL } from 'url'

type Migration = {
  up: (knex: any) => Promise<void>
  down: (knex: any) => Promise<void>
}

const migrationUrl = (file: string) =>
  pathToFileURL(`${process.cwd()}/db/migrations/${file}`).href

const createTableBuilder = (calls: string[]) => {
  const builder: any = new Proxy(
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
  return builder
}

const createKnex = () => {
  const entityTypeInserts: Array<Record<string, string>> = []
  const entityTypeDeletes: Array<Record<string, string>> = []
  const tableCalls: string[] = []
  const droppedTables: string[] = []

  const knex: any = (_table: string) => ({
    insert: async (data: Record<string, string>) => {
      entityTypeInserts.push(data)
    },
    where: (query: Record<string, string>) => ({
      del: async () => {
        entityTypeDeletes.push(query)
      },
    }),
  })

  knex.fn = { now: () => new Date('2026-06-20T00:00:00.000Z') }
  knex.schema = {
    createTable: async (table: string, callback: (b: any) => void) => {
      tableCalls.push(`create:${table}`)
      callback(createTableBuilder(tableCalls))
    },
    dropTable: async (table: string) => {
      droppedTables.push(table)
    },
  }

  return { knex, entityTypeInserts, entityTypeDeletes, tableCalls, droppedTables }
}

describe('spam ring migrations', () => {
  test('spam_ring: creates table, registers entity_type, key columns + indexes', async () => {
    const { up } = (await import(
      migrationUrl('20260620000000_create_spam_ring_table.js')
    )) as Migration
    const { knex, entityTypeInserts, tableCalls } = createKnex()

    await up(knex)

    expect(entityTypeInserts).toEqual([{ table: 'spam_ring' }])
    expect(tableCalls).toEqual(
      expect.arrayContaining([
        'create:spam_ring',
        'bigIncrements:id',
        'uuid:uuid',
        'text:fingerprint',
        'enu:status',
        'jsonb:signals',
        'integer:n_articles',
        'integer:n_authors',
        'decimal:new_account_ratio',
        'decimal:score',
        'enu:severity',
        'timestamp:detected_at',
        'bigInteger:frozen_by',
        'foreign:frozen_by',
        'index:status,score',
      ])
    )
  })

  test('spam_ring_member: includes banned_by_this_ring + unique(ring,user)', async () => {
    const { up } = (await import(
      migrationUrl('20260620001000_create_spam_ring_member_table.js')
    )) as Migration
    const { knex, entityTypeInserts, tableCalls } = createKnex()

    await up(knex)

    expect(entityTypeInserts).toEqual([{ table: 'spam_ring_member' }])
    expect(tableCalls).toEqual(
      expect.arrayContaining([
        'create:spam_ring_member',
        'bigInteger:ring_id',
        'bigInteger:user_id',
        'enu:status',
        'boolean:banned_by_this_ring',
        'enu:pre_freeze_state',
        'jsonb:evidence',
        'foreign:ring_id',
        'foreign:user_id',
        'index:ring_id,status',
      ])
    )
  })

  test('spam_ring_event: audit table with action enum + actor/member fks', async () => {
    const { up } = (await import(
      migrationUrl('20260620002000_create_spam_ring_event_table.js')
    )) as Migration
    const { knex, entityTypeInserts, tableCalls } = createKnex()

    await up(knex)

    expect(entityTypeInserts).toEqual([{ table: 'spam_ring_event' }])
    expect(tableCalls).toEqual(
      expect.arrayContaining([
        'create:spam_ring_event',
        'bigInteger:ring_id',
        'bigInteger:member_id',
        'bigInteger:actor_id',
        'enu:action',
        'jsonb:detail',
        'foreign:ring_id',
        'foreign:member_id',
        'foreign:actor_id',
        'index:ring_id,created_at',
      ])
    )
  })

  test('rollback drops tables and removes entity_type rows', async () => {
    for (const file of [
      '20260620000000_create_spam_ring_table.js',
      '20260620001000_create_spam_ring_member_table.js',
      '20260620002000_create_spam_ring_event_table.js',
    ]) {
      const { down } = (await import(migrationUrl(file))) as Migration
      const { knex, entityTypeDeletes, droppedTables } = createKnex()
      await down(knex)
      expect(entityTypeDeletes.length).toBe(1)
      expect(droppedTables.length).toBe(1)
    }
  })
})
