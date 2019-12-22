const table = 'user'

exports.up = async knex => await knex(table).where({
  state: 'onboarding'
}).update('state', 'active')

exports.down = () => {}
