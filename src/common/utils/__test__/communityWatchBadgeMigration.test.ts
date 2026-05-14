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
}

const migrationUrl = pathToFileURL(
  `${process.cwd()}/db/migrations/20260514000000_add_community_watch_user_badge.js`
).href

const createKnex = () => {
  const rawCalls: string[] = []
  const deletes: Array<{ table: string; query: Record<string, string> }> = []

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

  return { knex, rawCalls, deletes }
}

describe('community watch badge migration', () => {
  test('adds community_watch to user badge type', async () => {
    const { up } = (await import(migrationUrl)) as Migration
    const { knex, rawCalls } = createKnex()

    await up(knex)

    expect(rawCalls).toEqual([expect.stringContaining("'community_watch'")])
  })

  test('removes community_watch badges before restoring previous badge types', async () => {
    const { down } = (await import(migrationUrl)) as Migration
    const { knex, rawCalls, deletes } = createKnex()

    await down(knex)

    expect(deletes).toEqual([
      {
        table: 'user_badge',
        query: { type: 'community_watch' },
      },
    ])
    expect(rawCalls).toEqual([expect.not.stringContaining('community_watch')])
  })
})
