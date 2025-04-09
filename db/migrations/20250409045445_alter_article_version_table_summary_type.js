import { baseDown } from '../utils.js'

const table = 'article_version'
const view = 'article_version_newest'

export const up = async knex => {
  await knex.raw('DROP VIEW IF EXISTS ' + view)
  await knex.schema.alterTable(table, t => {
    t.text('summary').alter()
  })
  await knex.raw(/* sql*/ `
    CREATE OR REPLACE VIEW ${view} AS
      SELECT a.*
      FROM article_version a
      LEFT OUTER JOIN article_version b
          ON a.article_id= b.article_id AND a.id < b.id
      WHERE b.id IS NULL;
  `)
}

export const down = async knex => {
  await knex.raw('DROP VIEW IF EXISTS ' + view)
  await knex.schema.alterTable(table, t => {
    t.string('summary').alter()
  })
  await knex.raw(/* sql*/ `
    CREATE OR REPLACE VIEW ${view} AS
      SELECT a.*
      FROM article_version a
      LEFT OUTER JOIN article_version b
          ON a.article_id= b.article_id AND a.id < b.id
      WHERE b.id IS NULL;
  `)
}
