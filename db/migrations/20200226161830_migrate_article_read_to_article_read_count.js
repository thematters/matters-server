const source = 'article_read'
const target = 'article_read_count'

export const up = async (knex) => {
  // get total count of collapesed records
  const querySource = knex(source)
    .select('user_id', 'article_id')
    .groupBy('user_id', 'article_id', 'archived')

  const temp = await knex(source).from(querySource.as('source')).count().first()
  const count = parseInt(temp ? temp.count : '0', 10)
  console.log('source count', count)

  // migrate
  await knex.raw(`
    INSERT INTO ${target}
      (user_id, article_id, count, archived, created_at, updated_at)
    SELECT
      user_id,
      article_id,
      count(article_id) as count,
      archived,
      min(created_at) as created_at,
      max(created_at) as updated_at
    FROM ${source}
    GROUP BY
      user_id, article_id, archived
    ORDER BY
      user_id, article_id;
  `)

  // get total count of migrated records
  const result = await knex(target).count().first()
  const check = parseInt(result ? result.count : '0', 10)
  console.log('migrated count', check)
}

export const down = async (knex) => {
  await knex(target).truncate()
}
