const table = 'article_hottest_materialized'
const index = 'article_hottest_materialized_score_index'

exports.up = async (knex) => {
  await knex.raw(`CREATE INDEX ${index} ON ${table}(score DESC NULLS LAST);`)
}

exports.down = async (knex) => {
  await knex.raw(`DROP INDEX ${index};`)
}
