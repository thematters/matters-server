import { baseDown } from '../utils.js'

export const up = async (knex) => {
  await knex.schema.alterTable('topic_channel', (t) => {
    t.string('navbar_title').nullable()
  })
  await knex.schema.alterTable('curation_channel', (t) => {
    t.string('navbar_title').nullable()
  })

  await knex.schema.alterTable('campaign_channel', (t) => {
    t.string('navbar_title').nullable()
  })
}

export const down = async (knex) => {
  await knex.schema.alterTable('topic_channel', (t) => {
    t.dropColumn('navbar_title')
  })
  await knex.schema.alterTable('curation_channel', (t) => {
    t.dropColumn('navbar_title')
  })
  await knex.schema.alterTable('campaign_channel', (t) => {
    t.dropColumn('navbar_title')
  })
}
