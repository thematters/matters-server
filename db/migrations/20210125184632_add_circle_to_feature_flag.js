const table = 'feature_flag'

exports.up = async (knex) => {
  await knex(table).insert({ name: 'circle', flag: 'on' })
}

exports.down = async (knex) => {
  await knex(table).where('name', 'circle').del()
}
