exports.baseDown = table => async knex => {
  const _tables = await knex('pg_catalog.pg_tables')
    .select('tablename')
    .where({ schemaname: 'public' })

  if (_tables.length <= 0) {
    throw new Error('no tables')
  }

  if (_tables.indexOf('entity_type') >= 0) {
    await knex('entity_type')
      .where({ table })
      .del()
  }

  await knex.schema.dropTable(table)
}
