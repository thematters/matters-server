exports.up = async knex => {
  await knex.schema.dropTableIfExists('comment_mentioned_user')
}

exports.down = async knex => {}
