const table = 'tag'

export const up = async (knex) => {
  const matty = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  if (!matty) {
    return
  }

  // update current matty's tag
  await knex.raw(`
    UPDATE
      tag
    SET
      owner = creator
    WHERE
      creator = ${matty.id}
      AND array_length(editors, 1) = 1
      AND editors[1] = '${matty.id}'
  `)

  // update users' tags
  await knex.raw(`
    UPDATE
      tag
    SET
      owner = (array_remove(editors, '${matty.id}'))[1]::BIGINT
    WHERE
      array_length(editors, 1) = 2
  `)
}

export const down = async (knex) => {
  await knex(table).update('owner', null)
}
