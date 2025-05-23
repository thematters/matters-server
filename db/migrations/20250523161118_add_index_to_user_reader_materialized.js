const table = 'user_reader_materialized'
const indexName = 'user_reader_materialized_author_score_id_idx'

export const up = async (knex) => {
  // update index to use author_score DESC NULLS LAST
  await knex.schema.table(table, (t) => {
    t.dropIndex(['author_score', 'id'])
    t.index([knex.raw('author_score DESC NULLS LAST'), 'id'], indexName)
  })
  // remove redundant index: "user_reader_materialized_author_score" btree (author_score)
  await knex.raw(`DROP INDEX IF EXISTS user_reader_materialized_author_score`)
}

export const down = async (knex) => {
  await knex.raw(`DROP INDEX IF EXISTS ${indexName}`)
  await knex.schema.table(table, (t) => {
    t.index(['author_score', 'id'])
  })
}
