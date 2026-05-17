import { pathToFileURL } from 'url'

type Migration = {
  up: (knex: MockKnex) => Promise<void>
  down: (knex: MockKnex) => Promise<void>
}

type MockKnex = {
  raw: (sql: string) => Promise<void>
  schema: {
    alterTable: (
      table: string,
      callback: (tableBuilder: MockTableBuilder) => void
    ) => Promise<void>
  }
}

type MockTableBuilder = {
  timestamp: (column: string) => MockColumnBuilder
}

type MockColumnBuilder = {
  nullable: () => MockColumnBuilder
  notNullable: () => MockColumnBuilder
  alter: () => MockColumnBuilder
}

const migrationUrl = pathToFileURL(
  `${process.cwd()}/db/migrations/20260516000000_make_community_watch_content_expiry_nullable.js`
).href

const createKnex = () => {
  const rawCalls: string[] = []
  const alterCalls: string[] = []

  const columnBuilder: MockColumnBuilder = {
    nullable: () => {
      alterCalls.push('nullable')
      return columnBuilder
    },
    notNullable: () => {
      alterCalls.push('notNullable')
      return columnBuilder
    },
    alter: () => {
      alterCalls.push('alter')
      return columnBuilder
    },
  }

  const tableBuilder: MockTableBuilder = {
    timestamp: (column: string) => {
      alterCalls.push(`timestamp:${column}`)
      return columnBuilder
    },
  }

  const knex: MockKnex = {
    raw: async (sql: string) => {
      rawCalls.push(sql)
    },
    schema: {
      alterTable: async (table: string, callback) => {
        alterCalls.push(`alterTable:${table}`)
        callback(tableBuilder)
      },
    },
  }

  return { knex, rawCalls, alterCalls }
}

describe('community watch content expiry migration', () => {
  test('allows audit original content to have no expiry', async () => {
    const { up } = (await import(migrationUrl)) as Migration
    const { knex, alterCalls } = createKnex()

    await up(knex)

    expect(alterCalls).toEqual([
      'alterTable:community_watch_action',
      'timestamp:content_expires_at',
      'nullable',
      'alter',
    ])
  })

  test('restores seven-day fallback expiry before rollback', async () => {
    const { down } = (await import(migrationUrl)) as Migration
    const { knex, rawCalls, alterCalls } = createKnex()

    await down(knex)

    expect(rawCalls).toEqual([
      expect.stringContaining("created_at + INTERVAL '7 days'"),
    ])
    expect(alterCalls).toEqual([
      'alterTable:community_watch_action',
      'timestamp:content_expires_at',
      'notNullable',
      'alter',
    ])
  })
})
