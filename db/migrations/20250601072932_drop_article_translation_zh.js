export const up = async (knex) => {
  await knex('article_translation')
    .whereNot('model', 'google_translation_v2')
    .whereIn('language', ['zh_hans', 'zh_hant'])
    .del()
}

export const down = () => {}
