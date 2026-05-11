const userFederationSettingTable = 'user_federation_setting'
const articleFederationSettingTable = 'article_federation_setting'

export const up = async (knex) => {
  await knex('entity_type').insert([
    { table: userFederationSettingTable },
    { table: articleFederationSettingTable },
  ])

  await knex.schema.createTable(userFederationSettingTable, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('user_id').unsigned().notNullable()
    t.enu('state', ['enabled', 'disabled']).notNullable().defaultTo('disabled')
    t.bigInteger('updated_by').unsigned()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.unique(['user_id'])
    t.foreign('user_id').references('id').inTable('user')
    t.foreign('updated_by').references('id').inTable('user')
  })

  await knex.schema.createTable(articleFederationSettingTable, (t) => {
    t.bigIncrements('id').primary()
    t.bigInteger('article_id').unsigned().notNullable()
    t.enu('state', ['inherit', 'enabled', 'disabled'])
      .notNullable()
      .defaultTo('inherit')
    t.bigInteger('updated_by').unsigned()
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())

    t.unique(['article_id'])
    t.foreign('article_id').references('id').inTable('article')
    t.foreign('updated_by').references('id').inTable('user')
  })
}

export const down = async (knex) => {
  await knex.schema.dropTable(articleFederationSettingTable)
  await knex.schema.dropTable(userFederationSettingTable)
  await knex('entity_type')
    .whereIn('table', [
      userFederationSettingTable,
      articleFederationSettingTable,
    ])
    .del()
}
