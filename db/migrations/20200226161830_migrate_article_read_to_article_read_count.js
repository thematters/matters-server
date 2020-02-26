const source = 'article_read'
const target = 'article_read_count'

exports.up = async knex => {
  // get total count of collapesed records
  const querySource = knex(source)
    .select('user_id', 'article_id')
    .where({ archived: false })
    .groupBy('user_id', 'article_id')

  const temp = await knex(source)
    .from(querySource.as('source'))
    .count()
    .first()
  const count = parseInt(temp ? temp.count : '0', 10)
  console.log('source count', count)

  // migrate
  await knex.raw(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    INSERT INTO ${target}
      (uuid, user_id, article_id, count, created_at, updated_at)
    SELECT
      uuid_generate_v4() as uuid,
      user_id,
      article_id,
      count(article_id) as count,
      min(created_at) as created_at,
      max(created_at) as updated_at
    FROM ${source}
    WHERE archived = false
    GROUP BY
      user_id, article_id
    ORDER BY
      user_id, article_id;
  `)

  // get total count of migrated records
  const result = await knex(target)
    .count()
    .first()
  const check = parseInt(result ? result.count : '0', 10)
  console.log('migrated count', check)
}

exports.down = async knex => {
  await knex(target).truncate()
}
