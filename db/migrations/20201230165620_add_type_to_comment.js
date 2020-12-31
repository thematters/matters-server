const table = 'comment'
const column = 'type'

exports.up = (knex) =>
  knex.schema.table(table, (t) => {
    t.enu('type', ['article', 'circle_discussion', 'circle_announcement'])
      .notNullable()
      .defaultTo('article')

    t.index('type')
  })

exports.down = (knex) =>
  knex.schema.table(table, (t) => {
    t.dropColumn(column)
  })
