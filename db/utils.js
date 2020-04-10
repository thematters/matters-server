exports.baseDown = (table) => async (knex) => {
  const _tables = await knex('pg_catalog.pg_tables').select('tablename').where({
    schemaname: 'public',
  })

  if (_tables.length <= 0) {
    throw new Error('no tables')
  }

  try {
    await knex('entity_type')
      .where({
        table,
      })
      .del()
  } catch (e) {
    console.error(e)
  }

  await knex.schema.dropTable(table)
}

exports.alterEnumString = (table, column, enums) => {
  const constraints = `${table}_${column}_check`
  const enumValues = enums.join("'::text, '")
  return [
    `ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraints};`,
    `ALTER TABLE ${table} ADD CONSTRAINT ${constraints} CHECK (${column} = ANY (ARRAY['${enumValues}'::text]));`,
  ].join('\n')
}
