const table = 'circle_subscription_item'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.timestamp('canceled_at')
  })

  // set `canceled_at` to `updated_at` if it's archived
  await knex.raw(`
    UPDATE
      ${table}
    SET
      canceled_at = source.updated_at
    FROM
      (
        SELECT
          id, updated_at
        FROM
          ${table}
        WHERE archived = TRUE AND updated_at IS NOT NULL
      ) AS source
    WHERE ${table}.id = source.id
  `)
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn('canceled_at')
  })
}
