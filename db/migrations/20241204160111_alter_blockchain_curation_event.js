const table = 'blockchain_curation_event'

exports.up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.bigInteger('creator_id').unsigned()
    t.string('creator_address').nullable().alter()

    t.foreign('creator_id').references('id').inTable('user')

    t.index('creator_id')
  })
}

exports.down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('creator_id')
    t.string('creator_address').notNullable().alter()
  })
}
