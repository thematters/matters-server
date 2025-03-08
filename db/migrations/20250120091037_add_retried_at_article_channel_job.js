import { baseDown } from '../utils.js'

const article_channel_job_table = 'article_channel_job'

export const up = async (knex) => {
  await knex.schema.table(article_channel_job_table, function (t) {
    t.timestamp('retried_at')
  })
}

export const down = async (knex) => {
  await knex.schema.table(article_channel_job_table, function (t) {
    t.dropColumn('retried_at')
  })
}
