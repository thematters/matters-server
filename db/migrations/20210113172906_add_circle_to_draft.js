const table = 'draft'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger('circle_id').unsigned()

    t.foreign('circle_id').references('id').inTable('circle')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('circle_id')
  })
}
