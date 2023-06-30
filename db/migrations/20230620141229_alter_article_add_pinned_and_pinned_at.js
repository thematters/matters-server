const { baseDown } = require('../utils')

const table = 'article'
const newColumn = 'pinned_at'

const oldName = 'sticky'
const newName = 'pinned'

exports.up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.timestamp(newColumn)
    t.renameColumn(oldName, newName)
  })
  await knex(table)
    .update({ pinned_at: knex.ref('updated_at') })
    .where({ pinned: true })
}

exports.down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
    t.renameColumn(newName, oldName)
  })
}
