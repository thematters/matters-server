exports.up = async (knex) => {

  // get matty
  const matty = await knex('user')
    .select('id')
    .where({ email: 'hi@matters.news', role: 'admin', state: 'active' })
    .first()

  if (!matty) {
    console.log('matty not found')
    return
  }

  // get choice tag
  const mattyChoiceTag = await knex
    .select('id')
    .from('tag')
    .where({
      content: 'Matters 每日精選',
      owner: matty.id,
      deleted: false,
    })
    .first()

  if (!mattyChoiceTag) {
    console.log('choice tag not found')
    return
  }

  // auto-follow choice tag
  await knex.raw(`
    INSERT INTO action_tag (user_id, action, target_id)
    SELECT
      id AS user_id,
      'follow' AS action,
      '${mattyChoiceTag.id}' AS target_id
    FROM
      "user"
    WHERE
      state NOT IN ('archived')
    ORDER BY id
    ON CONFLICT (user_id, action, target_id) DO NOTHING
  `)
}

exports.down = async (knex) => {}
