const table = 'article_hottest_materialized'
const index = 'article_hottest_materialized_score_index'

export const up = async (knex) => {
  await knex.raw(`CREATE INDEX ${index} ON ${table}(score DESC NULLS LAST);`)
}

export const down = async (knex) => {
  await knex.raw(`DROP INDEX ${index};`)
}
