const action_circle = 'action_circle'
const article_circle = 'article_circle'

export const up = async (knex) => {
  await knex.schema.table(action_circle, (t) => {
    t.unique(['user_id', 'action', 'target_id'])
  })

  await knex.schema.table(article_circle, (t) => {
    t.unique(['article_id', 'circle_id'])
  })
}

export const down = async (knex) => {
  await knex.schema.table(article_circle, (t) => {
    t.dropUnique(['article_id', 'circle_id'])
  })

  await knex.schema.table(action_circle, (t) => {
    t.dropUnique(['user_id', 'action', 'target_id'])
  })
}
