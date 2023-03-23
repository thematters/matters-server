export const baseDown = (table) => async (knex) => {
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

export const alterEnumString = (table, column, enums) => {
  // put quotes for table user
  const tableName = table === 'user' ? '"user"' : table
  const constraints = `${table}_${column}_check`
  const enumValues = enums.join("'::text, '")
  return [
    `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${constraints};`,
    `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraints} CHECK (${column} = ANY (ARRAY['${enumValues}'::text]));`,
  ].join('\n')
}
