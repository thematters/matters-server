const table = 'user'

exports.up = async (knex) => await knex(table).update('state', 'onboarding')

exports.down = () => {}
