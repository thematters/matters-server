const table = 'article_channel_job'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropUnique('article_id')
    t.dropUnique('job_id')

    t.unique(['article_id', 'job_id'])
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropUnique(['article_id', 'job_id'])

    t.unique('article_id')
    t.unique('job_id')
  })
}
