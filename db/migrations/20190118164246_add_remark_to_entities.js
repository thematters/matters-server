const tables = ['article', 'user', 'comment', 'tag', 'report', 'feedback']

export const up = async (knex) => {
  await Promise.all(
    tables.map(async (table) => {
      await knex.schema.table(table, function (t) {
        t.text('remark')
      })
    })
  )
}

export const down = async (knex) => {
  await Promise.all(
    tables.map(async (table) => {
      await knex.raw(
        /*sql*/ `alter table "${table}" drop column if exists remark cascade`
      )
    })
  )
}
