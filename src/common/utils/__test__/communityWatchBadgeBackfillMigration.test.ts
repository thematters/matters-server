import { pathToFileURL } from 'url'

type Migration = {
  up: (knex: MockKnex) => Promise<void>
  down: (knex: MockKnex) => Promise<void>
}

type MockKnex = {
  raw: (sql: string) => Promise<void>
}

const migrationUrl = pathToFileURL(
  `${process.cwd()}/db/migrations/20260514010000_backfill_community_watch_user_badge.js`
).href

const createKnex = () => {
  const rawCalls: string[] = []
  const knex = {
    raw: async (sql: string) => {
      rawCalls.push(sql)
    },
  }

  return { knex: knex as MockKnex, rawCalls }
}

describe('community watch badge backfill migration', () => {
  test('backfills badges from existing community watch feature flags', async () => {
    const { up } = (await import(migrationUrl)) as Migration
    const { knex, rawCalls } = createKnex()

    await up(knex)

    expect(rawCalls).toHaveLength(1)
    expect(rawCalls[0]).toContain('INSERT INTO user_badge')
    expect(rawCalls[0]).toContain("SELECT user_id, 'community_watch'")
    expect(rawCalls[0]).toContain("WHERE type = 'communityWatch'")
    expect(rawCalls[0]).toContain('ON CONFLICT (user_id, type) DO NOTHING')
  })

  test('removes backfilled badges for community watch feature flag users', async () => {
    const { down } = (await import(migrationUrl)) as Migration
    const { knex, rawCalls } = createKnex()

    await down(knex)

    expect(rawCalls).toHaveLength(1)
    expect(rawCalls[0]).toContain('DELETE FROM user_badge')
    expect(rawCalls[0]).toContain("WHERE type = 'community_watch'")
    expect(rawCalls[0]).toContain('FROM user_feature_flag')
    expect(rawCalls[0]).toContain("WHERE type = 'communityWatch'")
  })
})
