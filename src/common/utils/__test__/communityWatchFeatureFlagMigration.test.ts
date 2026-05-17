import { pathToFileURL } from 'url'

type Migration = {
  up: (knex: MockKnex) => Promise<void>
  down: (knex: MockKnex) => Promise<void>
}

type MockKnex = {
  (table: string): {
    where: (query: Record<string, string>) => {
      del: () => Promise<void>
    }
  }
  raw: (sql: string) => Promise<void>
  schema: {
    alterTable: (
      table: string,
      callback: (tableBuilder: MockTableBuilder) => void
    ) => Promise<void>
  }
}

type MockTableBuilder = {
  unique: (columns: string[], indexName: string) => void
  dropUnique: (columns: string[], indexName: string) => void
}

const migrationUrl = pathToFileURL(
  `${process.cwd()}/db/migrations/20260510000000_add_community_watch_feature_flag.js`
).href

const createKnex = () => {
  const rawCalls: string[] = []
  const deletes: Array<{ table: string; query: Record<string, string> }> = []
  const tableCallbacks: Array<{
    table: string
    uniqueCalls: Array<[string[], string]>
    dropUniqueCalls: Array<[string[], string]>
  }> = []

  const knex = ((table: string) => ({
    where: (query: Record<string, string>) => ({
      del: async () => {
        deletes.push({ table, query })
      },
    }),
  })) as unknown as MockKnex

  knex.raw = async (sql: string) => {
    rawCalls.push(sql)
  }
  knex.schema = {
    alterTable: async (table: string, callback) => {
      const uniqueCalls: Array<[string[], string]> = []
      const dropUniqueCalls: Array<[string[], string]> = []
      const t: MockTableBuilder = {
        unique: (columns, indexName) => {
          uniqueCalls.push([columns, indexName])
        },
        dropUnique: (columns, indexName) => {
          dropUniqueCalls.push([columns, indexName])
        },
      }
      callback(t)
      tableCallbacks.push({ table, uniqueCalls, dropUniqueCalls })
    },
  }

  return { knex, rawCalls, deletes, tableCallbacks }
}

describe('community watch feature flag migration', () => {
  test('adds communityWatch and unique user feature flag constraint', async () => {
    const { up } = (await import(migrationUrl)) as Migration
    const { knex, rawCalls, tableCallbacks } = createKnex()

    await up(knex)

    expect(rawCalls).toEqual(
      expect.arrayContaining([expect.stringContaining('communityWatch')])
    )
    expect(rawCalls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('DELETE FROM user_feature_flag newer'),
      ])
    )
    expect(tableCallbacks[0].table).toBe('user_feature_flag')
    expect(tableCallbacks[0].uniqueCalls).toContainEqual([
      ['user_id', 'type'],
      'user_feature_flag_user_id_type_unique',
    ])
  })

  test('removes communityWatch before restoring previous feature flags', async () => {
    const { down } = (await import(migrationUrl)) as Migration
    const { knex, rawCalls, deletes, tableCallbacks } = createKnex()

    await down(knex)

    expect(tableCallbacks[0].table).toBe('user_feature_flag')
    expect(tableCallbacks[0].dropUniqueCalls).toContainEqual([
      ['user_id', 'type'],
      'user_feature_flag_user_id_type_unique',
    ])
    expect(deletes).toEqual([
      {
        table: 'user_feature_flag',
        query: { type: 'communityWatch' },
      },
    ])
    expect(rawCalls).toEqual([expect.not.stringContaining('communityWatch')])
  })
})
