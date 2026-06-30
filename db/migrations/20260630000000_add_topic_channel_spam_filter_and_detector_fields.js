const featureFlagTable = 'feature_flag'
const featureFlagName = 'topic_channel_spam_filter'
const articleTable = 'article'

export const up = async (knex) => {
  await knex(featureFlagTable)
    .insert({ name: featureFlagName, flag: 'on', value: 0.8 })
    .onConflict('name')
    .ignore()

  await knex.schema.table(articleTable, (t) => {
    t.text('decision').nullable()
    t.text('reason').nullable()
    t.float('p_spam').nullable()
    t.float('p_ham').nullable()
  })
}

export const down = async (knex) => {
  await knex.schema.table(articleTable, (t) => {
    t.dropColumn('decision')
    t.dropColumn('reason')
    t.dropColumn('p_spam')
    t.dropColumn('p_ham')
  })

  await knex(featureFlagTable).where({ name: featureFlagName }).del()
}
