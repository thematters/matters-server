const table = 'feature_flag'

exports.up = (knex) =>
  knex(table).insert({ name: 'verify_appreciate', enabled: true })

exports.down = (knex) => knex(table).where({ name: 'verify_appreciate' }).del()
