const table = 'feature_flag'
const feature = 'filter_inappropriate_content_in_latest_feed'

exports.up = async (knex) => {
  await knex(table).insert({
    name: feature,
    flag: 'off',
  })
}

exports.down = async (knex) => {
  await knex(table)
    .where('name', feature)
    .del()
}
