exports.up = async (knex) => {
  // add `iscn_publish` column
  await knex.schema.table('draft', (t) => {
    t.boolean('iscn_publish')
    t.string('iscn_id')
  })

  await knex.schema.table('article', (t) => {
    t.string('iscn_id')
  })
}

exports.down = async (knex) => {
  await knex.schema.table('article', (t) => {
    t.dropColumn('iscn_id')
  })

  await knex.schema.table('draft', (t) => {
    t.dropColumn('iscn_id')
    t.dropColumn('iscn_publish')
  })
}
