import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const table = 'moment_feed_user'
const csvPath = fileURLToPath(
  new URL('../migrations-data/seed_moment_feed_users.csv', import.meta.url)
)
const insertBatchSize = 1000

const parseUserIds = () => {
  const content = readFileSync(csvPath, 'utf8')
  const ids = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line))

  return [...new Set(ids)]
}

const chunk = (items, size) => {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export const up = async (knex) => {
  const ids = parseUserIds()
  if (ids.length === 0) {
    console.log('[seed_moment_feed_users] empty list, skipped')
    return
  }

  const existingIds = await knex('user').whereIn('id', ids).pluck('id')
  const existingIdSet = new Set(existingIds.map((id) => id.toString()))
  const missingCount = ids.filter((id) => !existingIdSet.has(id)).length

  let insertedCount = 0
  for (const batch of chunk(existingIds, insertBatchSize)) {
    const rows = batch.map((userId) => ({
      user_id: userId,
      state: 'approved',
      reviewed_by: 'seed',
      reviewer_id: null,
    }))
    const inserted = await knex(table)
      .insert(rows)
      .onConflict('user_id')
      .ignore()
      .returning('id')
    insertedCount += inserted.length
  }

  console.log(
    `[seed_moment_feed_users] total=${ids.length} existing=${existingIds.length} ` +
      `missing=${missingCount} inserted=${insertedCount}`
  )
}

export const down = async (knex) => {
  const ids = parseUserIds()
  if (ids.length === 0) {
    return
  }

  await knex(table)
    .where('reviewed_by', 'seed')
    .whereIn('user_id', ids)
    .del()
}
