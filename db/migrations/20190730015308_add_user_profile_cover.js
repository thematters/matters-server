const table = 'user'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger('profile_cover')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('profile_cover')
  })
}
