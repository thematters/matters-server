const table = 'article_read'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.string('ip')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('ip')
  })
}
