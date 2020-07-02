const table = 'feature_flag'

exports.up = async (knex) => {
  await knex(table).insert({ name: 'fingerprint', flag: 'off' })
}

exports.down = async (knex) => {
  await knex(table).where('name', 'fingerprint').del()
}
