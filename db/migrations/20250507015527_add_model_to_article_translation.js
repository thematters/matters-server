const table = 'article_translation'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    // Add model field
    t.string('model').defaultTo('google_translation_v2').notNullable()

    // Drop existing unique constraint if it exists
    t.dropUnique(['article_version_id', 'language'])

    // Add new unique constraint that includes model
    t.unique(['article_version_id', 'language', 'model'])
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropUnique(['article_version_id', 'language', 'model'])
    t.unique(['article_version_id', 'language'])
    t.dropColumn('model')
  })
}
