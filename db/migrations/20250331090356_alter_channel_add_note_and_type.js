import { baseDown } from '../utils.js'

const table = 'channel'

export const up = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.string('note').nullable()
    t.enum('type', ['topic', 'curation']).notNullable().defaultTo('topic')
    t.string('provider_id').nullable().alter()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable(table, (t) => {
    t.dropColumn('note')
    t.dropColumn('type')
    t.string('provider_id').notNullable().alter()
  })
}
