const { baseDown } = require('../utils')

const article_channel_job_table = 'article_channel_job'

exports.up = async (knex) => {
  await knex.schema.table(article_channel_job_table, function (t) {
    t.timestamp('retried_at')
  })
}

exports.down = async (knex) => {
  await knex.schema.table(article_channel_job_table, function (t) {
    t.dropColumn('retried_at')
  })
}
