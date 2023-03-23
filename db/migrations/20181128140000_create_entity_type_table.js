const table = 'entity_type'

export const up = function (knex, Promise) {
  return knex.schema.createTable(table, function (t) {
    t.bigIncrements('id').primary()
    t.string('table').notNullable().unique()
  })
}

export const down = function (knex, Promise) {
  return knex.schema.dropTable(table)
}
