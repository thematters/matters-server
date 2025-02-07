const table = 'article_channel_job'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropUnique('article_id')
    t.dropUnique('job_id')

    t.unique(['article_id', 'job_id'])
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropUnique(['article_id', 'job_id'])

    t.unique('article_id')
    t.unique('job_id')
  })
}
