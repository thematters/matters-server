const table = 'oauth_client'

export const up = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.bigInteger('user_id').nullable().alter()

    t.string('name').notNullable().unique()
    t.text('description')
    t.text('website_url')
    t.bigInteger('avatar')

    t.foreign('avatar').references('id').inTable('asset')
  })
}

export const down = async (knex) => {
  await knex.schema.table(table, function (t) {
    t.dropColumn('avatar')
    t.dropColumn('website_url')
    t.dropColumn('description')
    t.dropColumn('name')

    t.bigInteger('user_id').notNullable().alter()
  })
}
