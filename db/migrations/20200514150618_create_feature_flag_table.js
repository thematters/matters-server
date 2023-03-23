import { baseDown } from '../utils.js'

const table = 'feature_flag'

export const up = async (knex) => {
  await knex.schema.createTable(table, (t) => {
    t.bigIncrements('id').primary()
    t.string('name').notNullable().unique()
    t.boolean('enabled').notNullable().defaultTo(false)
    t.timestamp('created_at').defaultTo(knex.fn.now())
    t.timestamp('updated_at').defaultTo(knex.fn.now())
  })

  await knex(table).insert([
    { name: 'add_credit', enabled: false },
    { name: 'payment', enabled: false },
    { name: 'payout', enabled: false },
  ])
}

export const down = baseDown(table)
