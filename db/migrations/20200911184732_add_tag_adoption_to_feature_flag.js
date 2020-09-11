const table = 'feature_flag'

exports.up = async (knex) => {
  await knex(table).insert({ name: 'tag_adoption', flag: 'admin' })
}

exports.down = async (knex) => {
  await knex(table).where('name', 'tag_adoption').del()
}
