const comment = 'comment'

export const up = async (knex) => {
  await knex.schema.table(comment, function (t) {
    t.timestamp('pinned_at')
  })
}

export const down = async (knex) => {
  await knex.schema.table(comment, function (t) {
    t.dropColumn('pinned_at')
  })
}
