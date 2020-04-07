exports.up = async knex => {
  await knex('user')
    .where({ state: 'onboarding' })
    .update({ state: 'active' })
}

exports.down = () => {}
