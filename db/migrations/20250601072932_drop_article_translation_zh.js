export const up = async (knex) => {
  await knex('article_translation')
    .whereNot('model', 'google_translation_v2')
    .del()
}

export const down = () => {}
