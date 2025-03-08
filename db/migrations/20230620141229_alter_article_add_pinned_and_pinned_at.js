import { baseDown } from '../utils.js'

const table = 'article'
const newColumn = 'pinned_at'

const oldName = 'sticky'
const newName = 'pinned'

export const up = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.timestamp(newColumn)
    t.renameColumn(oldName, newName)
  })
  await knex(table)
    .update({ pinned_at: knex.ref('updated_at') })
    .where({ pinned: true })
}

export const down = async (knex) => {
  await knex.schema.table(table, (t) => {
    t.dropColumn(newColumn)
    t.renameColumn(newName, oldName)
  })
}
